import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AnalysisSource } from '../../core/analysis-handoff';
import { Sample } from '../../core/samples';
import { AnalysisApi, RunHandlers } from './analysis-api';
import { PredictionResponse, ProgressMessage } from './analysis.models';

/** EventSource de mentira: o teste manda os eventos pelo `emitir`. */
class FakeEventSource {
  static ultimo: FakeEventSource;
  onmessage: ((e: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(readonly url: string) {
    FakeEventSource.ultimo = this;
    // o servidor manda o "ready" logo que o stream abre
    queueMicrotask(() => this.emitir({ stage: 'ready', progress: 0, status: 'Conectado' }));
  }

  emitir(m: Partial<ProgressMessage>): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(m) }));
  }
}

/** Navegador em que o stream não abre: a análise segue sem progresso ao vivo. */
class EventSourceIndisponivel {
  constructor() {
    throw new Error('sem EventSource');
  }
}

const amostra: AnalysisSource = {
  kind: 'sample',
  sample: { id: 'adni-005-s-0221', arquivo: '005_S_0221.nii.gz' } as Sample,
};
const resposta = { status: 'success', diagnostico: 'ALZHEIMER' } as PredictionResponse;

function handlers(): RunHandlers & { progresso: ProgressMessage[] } {
  const progresso: ProgressMessage[] = [];
  return { progresso, onProgress: (m) => progresso.push(m), onUpload: () => undefined };
}

describe('AnalysisApi', () => {
  let api: AnalysisApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AnalysisApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('health() reconhece a API com fila pelo campo "fila" do /healthz', async () => {
    const saude = api.health();
    http.expectOne('/healthz').flush({
      status: 'ok',
      models_loaded: true,
      fila: { conectada: true, workers: 1, aguardando: 0 },
    });
    expect(await saude).toEqual({ state: 'ok', queue: true });

    const semFila = api.health();
    http.expectOne('/healthz').flush({ status: 'ok', models_loaded: true });
    expect(await semFila).toEqual({ state: 'ok', queue: false });
  });

  it('sem fila, a resposta do envio já é o resultado', async () => {
    vi.stubGlobal('EventSource', FakeEventSource);
    const h = handlers();
    const run = api.run(amostra, h, new AbortController().signal);
    const req = await vi.waitFor(() =>
      http.expectOne((r) => r.url.startsWith('/v1/predict/alzheimer/amostra/adni-005-s-0221?')),
    );
    expect(req.request.method).toBe('POST');
    req.flush(resposta);
    expect((await run).response).toEqual(resposta);
  });

  it('com fila: 202, posição pelo SSE e resultado buscado quando o SSE avisa o fim', async () => {
    vi.stubGlobal('EventSource', FakeEventSource);
    const h = handlers();
    const run = api.run(amostra, h, new AbortController().signal, true);

    const envio = await vi.waitFor(() =>
      http.expectOne((r) => r.url.startsWith('/v1/analises/amostra/adni-005-s-0221?job_id=')),
    );
    const jobId = new URL(envio.request.urlWithParams, 'http://x').searchParams.get('job_id');
    envio.flush(
      { job_id: jobId, estado: 'na_fila', posicao: 2, resultado: `/v1/analises/${jobId}` },
      { status: 202, statusText: 'Accepted' },
    );

    const sse = FakeEventSource.ultimo;
    expect(sse.url).toBe(`/v1/progress/${jobId}`);
    sse.emitir({ stage: 'queued', posicao: 2, progress: 0, status: '' });
    sse.emitir({ stage: 'start', progress: 0, status: '' });
    sse.emitir({ stage: 'result', http_status: 200, progress: 100, status: '' });

    const consulta = await vi.waitFor(() => http.expectOne(`/v1/analises/${jobId}`));
    expect(consulta.request.method).toBe('GET');
    consulta.flush(resposta);

    const r = await run;
    expect(r.response).toEqual(resposta);
    expect(r.liveProgress).toBe(true);
    // o fim é interno: só a posição e o início chegam a quem acompanha
    expect(h.progresso.map((m) => m.stage)).toEqual(['queued', 'start']);
    expect(sse.close).toHaveBeenCalled();
  });

  it('com fila e sem SSE: consulta a cada 2 s, mostra a posição e repassa o erro da análise', async () => {
    vi.stubGlobal('EventSource', EventSourceIndisponivel);
    vi.useFakeTimers();
    const h = handlers();
    const arquivo = new File([new Uint8Array(8)], 'exame.nii.gz');
    const run = api.run({ kind: 'file', file: arquivo }, h, new AbortController().signal, true);
    const falha = expect(run).rejects.toMatchObject({
      kind: 'format',
      message: 'Não foi possível ler o arquivo como NIfTI.',
    });

    await vi.advanceTimersByTimeAsync(0);
    const envio = http.expectOne((r) => r.url.startsWith('/v1/analises?job_id='));
    expect(envio.request.body).toBeInstanceOf(FormData);
    const jobId = new URL(envio.request.urlWithParams, 'http://x').searchParams.get('job_id');
    const ticket = (posicao: number) => ({
      job_id: jobId,
      estado: 'na_fila',
      posicao,
      resultado: `/v1/analises/${jobId}`,
    });
    envio.flush(ticket(3), { status: 202, statusText: 'Accepted' });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.progresso.at(-1)).toMatchObject({ stage: 'queued', posicao: 3 });

    await vi.advanceTimersByTimeAsync(2000);
    http
      .expectOne(`/v1/analises/${jobId}`)
      .flush(ticket(2), { status: 202, statusText: 'Accepted' });
    await vi.advanceTimersByTimeAsync(0);
    expect(h.progresso.at(-1)).toMatchObject({ stage: 'queued', posicao: 2 });

    await vi.advanceTimersByTimeAsync(2000);
    http
      .expectOne(`/v1/analises/${jobId}`)
      .flush(
        { detail: 'Não foi possível ler o arquivo como NIfTI.' },
        { status: 400, statusText: 'Bad Request' },
      );
    await falha;
  });
});
