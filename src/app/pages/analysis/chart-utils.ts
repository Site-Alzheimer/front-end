const NS = 'http://www.w3.org/2000/svg';

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  parent?.append(el);
  return el;
}

export function svgText(
  parent: Element,
  x: number,
  y: number,
  text: string,
  attrs: Record<string, string | number> = {},
): SVGTextElement {
  const t = svgEl('text', { x, y, ...attrs }, parent);
  t.textContent = text;
  return t;
}

/** Ticks "redondos" de 0 até cobrir `max`. */
export function niceTicks(max: number, target = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(+v.toFixed(6));
  return ticks;
}

export const fmt = (x: number, digits = 3) =>
  x.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const pct = (x: number) =>
  (x * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Probabilidade curta para as miniaturas: extremos viram "<0,01" / ">0,99". */
export const shortP = (p: number) => (p < 0.01 ? '<0,01' : p > 0.99 ? '>0,99' : fmt(p, 2));

export const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
