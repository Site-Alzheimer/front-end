import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Subscription, TimeoutError, firstValueFrom, timeout } from 'rxjs';
import { apiUrl } from '../../core/api';
import { AnalysisSource } from '../../core/analysis-handoff';
import { environment } from '../../../environments/environment';
import {
  AnalysisError,
  HealthResponse,
  PredictionResponse,
  ProgressMessage,
  QueueTicket,
} from './analysis.models';
import { openProgress } from './progress-stream';

export interface RunHandlers {
  onProgress(message: ProgressMessage): void;
  onUpload(loaded: number, total: number): void;
  onCompressed?(bytes: number, ms: number): void;
}

export interface RunResult {
  response: PredictionResponse;
  /** performance.now() de quando o upload terminou (ou da requisição, para amostras). */
  uploadDoneAt: number;
  responseAt: number;
  /** false se o stream de progresso (SSE) não abriu e o progresso ficou indeterminado. */
  liveProgress: boolean;
}

export interface ServerHealth {
  /** 'starting' = servidor no ar, mas ainda carregando os modelos (ou sem worker na fila). */
  state: 'ok' | 'starting' | 'down';
  /** A API põe os exames numa fila (RabbitMQ) e devolve o resultado depois. */
  queue: boolean;
}

/** Consulta do resultado na fila: a cada 5 s com o SSE (que avisa o fim), a cada 2 s sem ele. */
const CONSULTA_COM_SSE_MS = 5000;
const CONSULTA_SEM_SSE_MS = 2000;
/** Espera máxima na fila (o worker caiu e não voltou, por exemplo). */
const ESPERA_FILA_MS = 15 * 60_000;
/** Falhas de rede seguidas toleradas durante a espera. */
const FALHAS_DE_REDE = 5;

@Injectable({ providedIn: 'root' })
export class AnalysisApi {
  private readonly http = inject(HttpClient);

  async health(): Promise<ServerHealth> {
    try {
      const r = await firstValueFrom(
        this.http.get<HealthResponse>(apiUrl('/healthz')).pipe(timeout(4000)),
      );
      return { state: r.models_loaded ? 'ok' : 'starting', queue: r.fila !== undefined };
    } catch {
      return { state: 'down', queue: false };
    }
  }

  /**
   * Abre o stream de progresso (SSE), espera o "ready" do servidor (até 2 s) e só então envia
   * o exame; assim nenhuma mensagem do início se perde.
   *
   * - Sem fila: a resposta do envio já é o resultado.
   * - Com fila: o envio responde 202 na hora; o SSE mostra a posição e o progresso, e o resultado
   *   vem de GET /v1/analises/{job_id} quando o SSE avisa o fim (ou na consulta periódica).
   */
  async run(
    source: AnalysisSource,
    handlers: RunHandlers,
    signal: AbortSignal,
    queue = false,
  ): Promise<RunResult> {
    const jobId = newJobId();
    let terminou = false;
    let avisado = false;
    let acordar: (() => void) | null = null;
    const progresso = await openProgress(jobId, (m) => {
      if (m.stage === 'result') {
        avisado = true;
        acordar?.();
      } else if (!terminou && m.stage !== 'ready') {
        handlers.onProgress(m);
      }
    });
    const params = `job_id=${jobId}&visualizacao=true&explicacao=true`;

    let caminho: string;
    let body: FormData | null = null;
    if (source.kind === 'sample') {
      const id = encodeURIComponent(source.sample.id);
      caminho = queue ? `/v1/analises/amostra/${id}` : `/v1/predict/alzheimer/amostra/${id}`;
    } else {
      caminho = queue ? '/v1/analises' : '/v1/predict/alzheimer';
      body = new FormData();
      const { blob, name } = await prepareUpload(source.file, handlers);
      body.append('file', blob, name);
    }

    try {
      if (!queue) {
        const envio = await this.send<PredictionResponse>(
          apiUrl(`${caminho}?${params}`),
          body,
          handlers,
          signal,
        );
        return {
          response: envio.body,
          uploadDoneAt: envio.uploadDoneAt,
          responseAt: performance.now(),
          liveProgress: progresso !== null,
        };
      }

      const envio = await this.send<QueueTicket>(
        apiUrl(`${caminho}?${params}`),
        body,
        handlers,
        signal,
      );
      // Sem o SSE, a posição vem das respostas 202 (com ele, dos eventos "queued")
      const posicao = (t: QueueTicket): void => {
        if (!progresso && t.estado === 'na_fila' && t.posicao) {
          handlers.onProgress({ progress: 0, status: '', stage: 'queued', posicao: t.posicao });
        }
      };
      posicao(envio.body);

      const limite = performance.now() + ESPERA_FILA_MS;
      let falhas = 0;
      for (;;) {
        if (!avisado) {
          const intervalo = progresso ? CONSULTA_COM_SSE_MS : CONSULTA_SEM_SSE_MS;
          // espera o intervalo, o aviso de fim do SSE ou o cancelamento, o que vier primeiro
          await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, intervalo);
            acordar = () => {
              clearTimeout(t);
              resolve();
            };
            signal.addEventListener('abort', acordar, { once: true });
          });
          if (acordar) signal.removeEventListener('abort', acordar);
          acordar = null;
        }
        avisado = false;
        if (signal.aborted) throw new DOMException('cancelado', 'AbortError');
        if (performance.now() > limite) {
          throw new AnalysisError(
            'timeout',
            'A análise ficou tempo demais na fila. Tente novamente em alguns minutos.',
          );
        }
        try {
          const r = await firstValueFrom(
            this.http
              .get<PredictionResponse | QueueTicket>(apiUrl(`/v1/analises/${jobId}`), {
                observe: 'response',
              })
              .pipe(timeout(30_000)),
          );
          falhas = 0;
          if (r.status === 200 && r.body) {
            return {
              response: r.body as PredictionResponse,
              uploadDoneAt: envio.uploadDoneAt,
              responseAt: performance.now(),
              liveProgress: progresso !== null,
            };
          }
          if (r.body) posicao(r.body as QueueTicket);
        } catch (err) {
          // a rede oscilou durante a espera: o resultado continua guardado no servidor
          const rede =
            err instanceof TimeoutError || (err instanceof HttpErrorResponse && err.status === 0);
          if (!rede || ++falhas >= FALHAS_DE_REDE) throw toAnalysisError(err);
        }
      }
    } finally {
      terminou = true;
      progresso?.close();
    }
  }

  /** POST com o progresso do upload; devolve o corpo da resposta e quando o upload terminou. */
  private send<T>(
    url: string,
    body: FormData | null,
    handlers: RunHandlers,
    signal: AbortSignal,
  ): Promise<{ body: T; uploadDoneAt: number }> {
    let uploadDoneAt = performance.now();
    let sub: Subscription | undefined;
    return new Promise<{ body: T; uploadDoneAt: number }>((resolve, reject) => {
      const aborto = (): void => {
        sub?.unsubscribe();
        reject(new DOMException('cancelado', 'AbortError'));
      };
      if (signal.aborted) {
        aborto();
        return;
      }
      signal.addEventListener('abort', aborto, { once: true });
      sub = this.http
        .post<T>(url, body, { reportProgress: true, observe: 'events' })
        .pipe(timeout(environment.requestTimeoutMs))
        .subscribe({
          next: (e) => {
            if (e.type === HttpEventType.UploadProgress) {
              handlers.onUpload(e.loaded, e.total ?? e.loaded);
              if (e.total && e.loaded >= e.total) uploadDoneAt = performance.now();
            } else if (e.type === HttpEventType.Response && e.body) {
              signal.removeEventListener('abort', aborto);
              resolve({ body: e.body, uploadDoneAt });
            }
          },
          error: (err) => {
            signal.removeEventListener('abort', aborto);
            reject(toAnalysisError(err));
          },
        });
    });
  }
}

// .nii cru vai compactado (o back aceita .nii.gz); o ganho varia muito de exame para exame
async function prepareUpload(
  file: File,
  handlers: RunHandlers,
): Promise<{ blob: Blob; name: string }> {
  const podeCompactar =
    environment.compressUploads &&
    /\.nii$/i.test(file.name) &&
    typeof CompressionStream !== 'undefined';
  if (!podeCompactar) return { blob: file, name: file.name };
  const t0 = performance.now();
  const blob = await new Response(file.stream().pipeThrough(new CompressionStream('gzip'))).blob();
  handlers.onCompressed?.(blob.size, performance.now() - t0);
  return blob.size < file.size
    ? { blob, name: `${file.name}.gz` }
    : { blob: file, name: file.name };
}

function newJobId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // randomUUID só existe em contexto seguro (HTTPS/localhost)
  const b = crypto.getRandomValues(new Uint8Array(16));
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function toAnalysisError(err: unknown): AnalysisError {
  if (err instanceof AnalysisError) return err;
  if (err instanceof TimeoutError) {
    return new AnalysisError(
      'timeout',
      'O servidor demorou demais para responder. Tente novamente.',
    );
  }
  if (err instanceof HttpErrorResponse) {
    const detalhe = typeof err.error?.detail === 'string' ? err.error.detail : '';
    if (err.status === 0)
      return new AnalysisError(
        'network',
        'Não foi possível falar com o servidor. Confira a conexão.',
      );
    if (err.status === 400 || err.status === 422)
      return new AnalysisError('format', detalhe || 'O arquivo não pôde ser analisado.');
    if (err.status === 503)
      return new AnalysisError('starting', 'O servidor está iniciando e carregando os modelos.');
    // Respostas do nginx do servidor, antes de chegar à API
    if (err.status === 413)
      return new AnalysisError('format', 'O arquivo passa do limite de 100 MB do servidor.');
    if (err.status === 429)
      return new AnalysisError(
        'server',
        'Muitas análises seguidas a partir da sua conexão. Aguarde um minuto e tente de novo.',
      );
    if (err.status === 502 || err.status === 504)
      return new AnalysisError(
        'server',
        'O serviço de análise não respondeu. Tente de novo em instantes.',
      );
    return new AnalysisError('server', detalhe || `Erro no servidor (${err.status}).`);
  }
  return new AnalysisError('server', err instanceof Error ? err.message : 'Erro inesperado.');
}
