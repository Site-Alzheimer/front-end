import { apiUrl } from '../../core/api';
import { ProgressMessage } from './analysis.models';

/**
 * Abre o stream SSE de progresso (GET /v1/progress/{job_id}) e espera o evento "ready" do
 * servidor por até `esperaMs`. Sem ele (erro, servidor antigo, proxy segurando os eventos),
 * devolve null e a análise segue sem progresso ao vivo.
 */
export function openProgress(
  jobId: string,
  onMessage: (m: ProgressMessage) => void,
  esperaMs = 2000,
): Promise<EventSource | null> {
  return new Promise((resolve) => {
    let es: EventSource;
    try {
      es = new EventSource(apiUrl(`/v1/progress/${encodeURIComponent(jobId)}`));
    } catch {
      resolve(null);
      return;
    }
    let pronto = false;
    const desistir = (): void => {
      clearTimeout(espera);
      es.close();
      resolve(null);
    };
    const espera = setTimeout(desistir, esperaMs);
    es.onmessage = (e: MessageEvent<string>) => {
      const m = JSON.parse(e.data) as ProgressMessage;
      if (m.stage === 'ready' && !pronto) {
        pronto = true;
        clearTimeout(espera);
        resolve(es);
      }
      onMessage(m);
    };
    // Depois do "ready", o EventSource reconecta sozinho se a conexão cair
    es.onerror = () => {
      if (!pronto) desistir();
    };
  });
}
