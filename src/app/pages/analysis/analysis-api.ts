import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Subscription, TimeoutError, firstValueFrom, timeout } from 'rxjs';
import { apiUrl, wsUrl } from '../../core/api';
import { AnalysisSource } from '../../core/analysis-handoff';
import { environment } from '../../../environments/environment';
import { AnalysisError, PredictionResponse, ProgressMessage } from './analysis.models';

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
  /** false se o WebSocket não conectou e o progresso ficou indeterminado. */
  liveProgress: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnalysisApi {
  private readonly http = inject(HttpClient);

  /** 'starting' = servidor no ar, mas ainda carregando os modelos. */
  async health(): Promise<'ok' | 'starting' | 'down'> {
    try {
      const r = await firstValueFrom(
        this.http.get<{ models_loaded: boolean }>(apiUrl('/healthz')).pipe(timeout(4000)),
      );
      return r.models_loaded ? 'ok' : 'starting';
    } catch {
      return 'down';
    }
  }

  /**
   * Abre o WebSocket de progresso, espera o "ready" do servidor (até 2 s) e só então envia
   * o exame; assim nenhuma mensagem do início se perde. A resposta HTTP é a fonte da verdade.
   */
  async run(
    source: AnalysisSource,
    handlers: RunHandlers,
    signal: AbortSignal,
  ): Promise<RunResult> {
    const jobId = newJobId();
    let respondido = false;
    const ws = await openProgress(jobId, (m) => {
      if (!respondido && m.stage !== 'ready') handlers.onProgress(m);
    });
    const params = `job_id=${jobId}&visualizacao=true&explicacao=true`;

    let url: string;
    let body: FormData | null = null;
    if (source.kind === 'sample') {
      url = apiUrl(
        `/v1/predict/alzheimer/amostra/${encodeURIComponent(source.sample.id)}?${params}`,
      );
    } else {
      url = apiUrl(`/v1/predict/alzheimer?${params}`);
      body = new FormData();
      const { blob, name } = await prepareUpload(source.file, handlers);
      body.append('file', blob, name);
    }

    let uploadDoneAt = performance.now();
    let sub: Subscription | undefined;
    const aborto = () => sub?.unsubscribe();
    signal.addEventListener('abort', aborto);
    try {
      const response = await new Promise<PredictionResponse>((resolve, reject) => {
        sub = this.http
          .post<PredictionResponse>(url, body, { reportProgress: true, observe: 'events' })
          .pipe(timeout(environment.requestTimeoutMs))
          .subscribe({
            next: (e) => {
              if (e.type === HttpEventType.UploadProgress) {
                handlers.onUpload(e.loaded, e.total ?? e.loaded);
                if (e.total && e.loaded >= e.total) uploadDoneAt = performance.now();
              } else if (e.type === HttpEventType.Response && e.body) {
                resolve(e.body);
              }
            },
            error: (err) => reject(toAnalysisError(err)),
          });
        signal.addEventListener('abort', () => reject(new DOMException('cancelado', 'AbortError')));
      });
      respondido = true;
      return { response, uploadDoneAt, responseAt: performance.now(), liveProgress: ws !== null };
    } finally {
      signal.removeEventListener('abort', aborto);
      ws?.close();
    }
  }
}

function openProgress(
  jobId: string,
  onMessage: (m: ProgressMessage) => void,
): Promise<WebSocket | null> {
  return new Promise((resolve) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl(`/ws/progress/${jobId}`));
    } catch {
      resolve(null);
      return;
    }
    const desistir = setTimeout(() => {
      ws.close();
      resolve(null);
    }, 2000);
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data) as ProgressMessage;
      if (m.stage === 'ready') {
        clearTimeout(desistir);
        resolve(ws);
      }
      onMessage(m);
    };
    ws.onerror = () => {
      clearTimeout(desistir);
      resolve(null);
    };
  });
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
