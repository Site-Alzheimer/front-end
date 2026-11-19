import { ProgressMessage } from './analysis.models';
import { openProgress } from './progress-stream';

/** EventSource de mentira: o teste decide quando chegam os eventos e os erros. */
class FakeEventSource {
  static ultimo: FakeEventSource;
  onmessage: ((e: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  fechado = false;

  constructor(readonly url: string) {
    FakeEventSource.ultimo = this;
  }

  close(): void {
    this.fechado = true;
  }

  emitir(m: Partial<ProgressMessage>): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(m) }));
  }
}

const pronto: Partial<ProgressMessage> = { progress: 0, status: 'Conectado', stage: 'ready' };

describe('openProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('EventSource', FakeEventSource);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('abre /v1/progress/{id} e só devolve o stream depois do "ready"', async () => {
    const recebidas: ProgressMessage[] = [];
    const aberto = openProgress('job-12345678', (m) => recebidas.push(m));
    const es = FakeEventSource.ultimo;
    expect(es.url).toBe('/v1/progress/job-12345678');

    es.emitir(pronto);
    await expect(aberto).resolves.toBe(es);
    es.emitir({ progress: 40, status: 'CNN1', stage: 'cnn1', done: 1, total: 8 });

    expect(recebidas.map((m) => m.stage)).toEqual(['ready', 'cnn1']);
    expect(es.fechado).toBe(false);
  });

  it('desiste sem o "ready" no prazo e fecha o stream', async () => {
    const aberto = openProgress('job-12345678', () => {}, 2000);
    vi.advanceTimersByTime(2000);

    await expect(aberto).resolves.toBeNull();
    expect(FakeEventSource.ultimo.fechado).toBe(true);
  });

  it('desiste se a conexão falha antes do "ready"', async () => {
    const aberto = openProgress('job-12345678', () => {});
    FakeEventSource.ultimo.onerror?.();

    await expect(aberto).resolves.toBeNull();
    expect(FakeEventSource.ultimo.fechado).toBe(true);
  });

  it('depois do "ready", um erro deixa o EventSource reconectar', async () => {
    const aberto = openProgress('job-12345678', () => {});
    const es = FakeEventSource.ultimo;
    es.emitir(pronto);
    await aberto;

    es.onerror?.();
    vi.advanceTimersByTime(5000);
    expect(es.fechado).toBe(false);
  });
});
