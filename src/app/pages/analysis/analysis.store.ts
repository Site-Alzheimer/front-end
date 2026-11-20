import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { AnalysisSource } from '../../core/analysis-handoff';
import { AnalysisApi, ServerHealth } from './analysis-api';
import { AnalysisError, PredictionResponse, ProgressMessage } from './analysis.models';
import { toView } from './analysis-view';
import { prefersReducedMotion } from './chart-utils';
import { DecodedVolume } from './volume/volume-decoder';
import { VolumeJob, loadVolume } from './volume/volume-client';

export type Phase = 'idle' | 'processing' | 'done' | 'error';
export type StepKey = 'upload' | 'queue' | 'load' | 'cnn1' | 'extract' | 'cnn2' | 'done';

/** Ordem das etapas na tela; `queue` só aparece quando a API usa a fila de análises. */
export const STEP_ORDER: StepKey[] = ['upload', 'queue', 'load', 'cnn1', 'extract', 'cnn2', 'done'];

export interface ClientTimings {
  compressMs?: number;
  uploadBytes?: number;
  /** Do envio até o fim do upload. */
  uploadMs?: number;
  /** Do fim do upload até a resposta. */
  waitMs?: number;
  /**
   * Do fim do upload até o painel desenhado: a métrica de tempo de resposta do TCC. Não conta a
   * pausa do "Análise concluída" (finishHoldMs), que é só visual.
   */
  uploadToRenderMs?: number;
  /** Pausa em que a tela de processamento mostra "Análise concluída" antes do painel. */
  finishHoldMs?: number;
  totalMs?: number;
}

/** Quanto tempo o "Análise concluída" fica na tela antes do painel. */
const PAUSA_CONCLUSAO_MS = 800;

const ETAPA: Record<string, StepKey> = {
  // o worker da fila pegou o exame: a leitura do volume começa em seguida
  start: 'load',
  load: 'load',
  cnn1: 'cnn1',
  extract: 'extract',
  cnn2: 'cnn2',
  done: 'done',
};

/** Estado de uma análise; vive só enquanto a rota /analise está aberta. */
@Injectable()
export class AnalysisStore implements OnDestroy {
  private readonly api = inject(AnalysisApi);

  readonly phase = signal<Phase>('idle');
  readonly source = signal<AnalysisSource | null>(null);
  readonly step = signal<StepKey>('upload');
  readonly status = signal('');
  readonly upload = signal({ loaded: 0, total: 0 });
  readonly cnn1 = signal({ done: 0, total: 0 });
  /** Scores da CNN1 recebidos pelo stream de progresso, já no índice canônico (NaN = ainda não chegou). */
  readonly liveScores = signal<number[]>([]);
  readonly liveProgress = signal(true);
  /** A API põe os exames numa fila (RabbitMQ). */
  readonly usesQueue = signal(false);
  /** Lugar na fila, contando os exames em análise; null fora da fila. */
  readonly queuePosition = signal<number | null>(null);
  readonly response = signal<PredictionResponse | null>(null);
  /** O resultado chegou: a tela de processamento mostra "Análise concluída" antes do painel. */
  readonly finished = signal(false);
  readonly view = computed(() => {
    const r = this.response();
    return r ? toView(r) : null;
  });
  readonly error = signal<AnalysisError | null>(null);
  readonly volume = signal<DecodedVolume | null>(null);
  readonly volumeState = signal<'none' | 'loading' | 'ready' | 'error' | 'server'>('none');
  readonly volumeError = signal('');
  readonly timings = signal<ClientTimings>({});

  readonly fileName = computed(() => {
    const s = this.source();
    return !s ? '' : s.kind === 'file' ? s.file.name : s.sample.arquivo;
  });

  private abort: AbortController | null = null;
  private volumeJob: VolumeJob | null = null;
  private volumeSource: AnalysisSource | null = null;
  private t0 = 0;
  private uploadDoneAt = 0;
  private finishHoldMs = 0;

  async start(source: AnalysisSource): Promise<void> {
    this.abort?.abort();
    const abort = (this.abort = new AbortController());
    this.source.set(source);
    this.phase.set('processing');
    this.step.set(source.kind === 'file' ? 'upload' : 'load');
    this.status.set('Conferindo o servidor…');
    this.upload.set({ loaded: 0, total: source.kind === 'file' ? source.file.size : 0 });
    this.cnn1.set({ done: 0, total: 0 });
    this.liveScores.set([]);
    this.usesQueue.set(false);
    this.queuePosition.set(null);
    this.response.set(null);
    this.finished.set(false);
    this.finishHoldMs = 0;
    this.error.set(null);
    this.timings.set({});
    this.t0 = performance.now();
    this.loadVolumeFor(source); // em paralelo com o envio

    try {
      const fila = (await this.waitForServer(abort.signal)).queue;
      this.usesQueue.set(fila);
      if (fila && source.kind === 'sample') {
        this.step.set('queue');
        this.status.set('Entrando na fila de análise…');
      }
      const run = await this.api.run(
        source,
        {
          onUpload: (loaded, total) => {
            this.upload.set({ loaded, total });
            if (loaded < total) {
              this.status.set('Enviando o exame…');
            } else if (fila) {
              this.advance('queue');
              this.status.set('Exame enviado. Entrando na fila de análise…');
            } else {
              this.status.set('Exame enviado. Aguardando o servidor…');
            }
          },
          onCompressed: (bytes, ms) =>
            this.timings.update((t) => ({ ...t, compressMs: ms, uploadBytes: bytes })),
          onProgress: (m) => this.onProgress(m),
        },
        abort.signal,
        fila,
      );
      if (abort.signal.aborted) return;
      this.uploadDoneAt = run.uploadDoneAt;
      this.liveProgress.set(run.liveProgress);
      this.timings.update((t) => ({
        ...t,
        uploadMs: run.uploadDoneAt - this.t0,
        waitMs: run.responseAt - run.uploadDoneAt,
      }));
      this.step.set('done');
      this.response.set(run.response);
      this.finished.set(true);
      this.finishHoldMs = prefersReducedMotion() ? 0 : PAUSA_CONCLUSAO_MS;
      if (this.finishHoldMs) {
        await new Promise((resolve) => setTimeout(resolve, this.finishHoldMs));
        if (abort.signal.aborted) return;
      }
      this.phase.set('done');
    } catch (e) {
      if (abort.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return;
      this.error.set(e instanceof AnalysisError ? e : new AnalysisError('server', String(e)));
      this.phase.set('error');
    }
  }

  /** Chamado pelo painel depois de desenhado, para medir o tempo de resposta percebido. */
  markRendered(): void {
    const agora = performance.now();
    this.timings.update((t) => ({
      ...t,
      uploadToRenderMs: agora - this.uploadDoneAt - this.finishHoldMs,
      finishHoldMs: this.finishHoldMs,
      totalMs: agora - this.t0,
    }));
  }

  retry(): void {
    const s = this.source();
    if (s) void this.start(s);
  }

  reset(): void {
    this.abort?.abort();
    this.volumeJob?.cancel();
    this.volumeJob = null;
    this.volumeSource = null;
    this.source.set(null);
    this.response.set(null);
    this.error.set(null);
    this.volume.set(null);
    this.volumeState.set('none');
    this.phase.set('idle');
  }

  ngOnDestroy(): void {
    this.abort?.abort();
    this.volumeJob?.cancel();
  }

  /** Avança para a etapa, nunca volta (os eventos da fila e do envio podem se cruzar). */
  private advance(etapa: StepKey): void {
    if (STEP_ORDER.indexOf(etapa) > STEP_ORDER.indexOf(this.step())) this.step.set(etapa);
  }

  private onProgress(m: ProgressMessage): void {
    if (m.stage === 'queued') {
      // posição só vale enquanto o exame espera; depois do início, um aviso atrasado é ignorado
      if (!m.posicao || STEP_ORDER.indexOf(this.step()) > STEP_ORDER.indexOf('queue')) return;
      this.advance('queue');
      this.queuePosition.set(m.posicao);
      this.status.set(queueStatus(m.posicao));
      return;
    }
    if (m.stage === 'start') this.queuePosition.set(null);
    const etapa = m.stage && ETAPA[m.stage];
    if (etapa) this.advance(etapa);
    if (m.stage === 'load') this.status.set('Lendo o volume no servidor…');
    if (m.stage === 'cnn1' && m.done != null && m.total) {
      this.cnn1.set({ done: m.done, total: m.total });
      this.status.set(`CNN1 avaliou ${m.done} de ${m.total} fatias coronais`);
      if (m.scores && m.start != null) {
        const n = m.total;
        const scores =
          this.liveScores().length === n ? [...this.liveScores()] : new Array<number>(n).fill(NaN);
        m.scores.forEach((s, i) => (scores[m.start! + i] = s));
        this.liveScores.set(scores);
      }
    }
    if (m.stage === 'extract') this.status.set('Extraindo as 19 fatias em torno da central…');
    if (m.stage === 'cnn2') this.status.set('CNN2 classificou as 19 fatias');
  }

  private async waitForServer(signal: AbortSignal): Promise<ServerHealth> {
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      const saude = await this.api.health();
      if (saude.state === 'ok') return saude;
      if (saude.state === 'down') {
        throw new AnalysisError(
          'network',
          'Não foi possível falar com o servidor. Confira se a API está no ar.',
        );
      }
      this.status.set('O servidor está iniciando e carregando os modelos. Tentando de novo…');
      await new Promise((r) => setTimeout(r, 3000));
      if (signal.aborted) throw new DOMException('cancelado', 'AbortError');
    }
    throw new AnalysisError(
      'starting',
      'O servidor não terminou de carregar os modelos. Tente em alguns minutos.',
    );
  }

  private loadVolumeFor(source: AnalysisSource): void {
    // Exames de exemplo (ADNI) ficam só no servidor: o navegador não recebe o arquivo
    if (source.kind === 'sample') {
      this.volumeJob?.cancel();
      this.volumeJob = null;
      this.volumeSource = source;
      this.volume.set(null);
      this.volumeState.set('server');
      return;
    }
    if (this.volumeSource === source && this.volumeState() !== 'error') return;
    this.volumeJob?.cancel();
    this.volumeSource = source;
    this.volume.set(null);
    this.volumeState.set('loading');
    this.volumeJob = loadVolume(source.file);
    this.volumeJob.promise
      .then((v) => {
        if (!v || this.volumeSource !== source) return;
        this.volume.set(v);
        this.volumeState.set('ready');
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        this.volumeError.set(e instanceof Error ? e.message : String(e));
        this.volumeState.set('error');
      });
  }
}

/** "Na fila: 2 exames na frente do seu." A posição conta o exame em análise. */
export function queueStatus(posicao: number): string {
  const frente = posicao - 1;
  if (frente <= 0) return 'Na fila: o seu exame é o próximo.';
  return `Na fila: ${frente} ${frente === 1 ? 'exame' : 'exames'} na frente do seu.`;
}
