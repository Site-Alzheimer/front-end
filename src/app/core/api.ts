import { environment } from '../../environments/environment';

const base = environment.apiUrl.replace(/\/$/, '');

/** URL HTTP da API (vazia em desenvolvimento: o proxy do `ng serve` repassa). */
export function apiUrl(path: string): string {
  return `${base}${path}`;
}

/** URL do WebSocket correspondente, no mesmo host da API. */
export function wsUrl(path: string): string {
  const http = base || `${location.protocol}//${location.host}`;
  return http.replace(/^http/, 'ws') + path;
}
