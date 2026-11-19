import { environment } from '../../environments/environment';

const base = environment.apiUrl.replace(/\/$/, '');

/** URL HTTP da API (vazia em desenvolvimento: o proxy do `ng serve` repassa). */
export function apiUrl(path: string): string {
  return `${base}${path}`;
}
