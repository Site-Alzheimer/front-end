import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ChartTooltip } from '../../chart-tooltip';
import { fmt, svgEl, svgText } from '../../chart-utils';
import { ScanCursor } from '../../scan-cursor';
import { SliceEntry } from '../../analysis-view';

const H = 220;
const M = { left: 36, right: 8, top: 12, bottom: 34 };

/** P(DA) das 19 fatias em barras a partir de 0, com o limiar 0,5 e a média. */
@Component({
  selector: 'app-slice-bars',
  template: `<svg
    #svg
    class="ui-chart"
    role="img"
    aria-label="Probabilidade de DA por fatia"
    [attr.height]="height"
  ></svg>`,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliceBars {
  readonly slices = input.required<SliceEntry[]>();
  readonly mean = input.required<number>();
  readonly cursor = input.required<ScanCursor>();

  protected readonly height = H;
  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private readonly width = signal(0);
  private readonly tooltip = inject(ChartTooltip);

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const ro = new ResizeObserver(([e]) => this.width.set(Math.round(e.contentRect.width)));
      ro.observe(host);
      destroyRef.onDestroy(() => ro.disconnect());
    });
    afterRenderEffect(() => this.render(this.slices(), this.mean(), this.width()));
    // destaque da barra quando uma miniatura (ou a própria barra) está em foco
    afterRenderEffect(() => {
      const k = this.cursor().highlighted();
      this.width();
      this.svg()
        .nativeElement.querySelectorAll<SVGPathElement>('path[data-k]')
        .forEach((p) => {
          p.style.opacity = k === null || Number(p.dataset['k']) === k ? '1' : '0.35';
        });
    });
  }

  private render(slices: SliceEntry[], mean: number, W: number): void {
    const svg = this.svg().nativeElement;
    svg.replaceChildren();
    if (!W) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const plotW = W - M.left - M.right;
    const plotH = H - M.top - M.bottom;
    const faixa = plotW / slices.length;
    const barra = Math.max(4, Math.min(24, faixa * 0.55));
    const y = (v: number) => M.top + (1 - v) * plotH;
    const base = y(0);

    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      svgEl(
        'line',
        { x1: M.left, x2: W - M.right, y1: y(t), y2: y(t), stroke: 'var(--chart-grid)' },
        svg,
      );
      svgText(
        svg,
        M.left - 8,
        y(t) + 4,
        t === 0 ? '0' : t === 1 ? '1' : fmt(t, t === 0.5 ? 1 : 2),
        {
          'text-anchor': 'end',
        },
      );
    }
    slices.forEach((s, i) => {
      const cx = M.left + faixa * (i + 0.5);
      // cresce da linha de base; um toco de 2 px mantém visíveis (e clicáveis) valores perto de 0
      const topo = Math.min(y(s.p), base - 2);
      const h = base - topo;
      const cima = s.p > 0.5;
      const rr = Math.min(4, h, barra / 2);
      const [x0, x1] = [cx - barra / 2, cx + barra / 2];
      // ponta arredondada só na extremidade do dado; a base fica reta
      const d = `M${x0},${base}V${topo + rr}Q${x0},${topo} ${x0 + rr},${topo}H${x1 - rr}Q${x1},${topo} ${x1},${topo + rr}V${base}Z`;
      const rotulo =
        s.offset === 0 ? 'central' : `${s.offset > 0 ? '+' : '−'}${Math.abs(s.offset)}`;
      const g = svgEl(
        'g',
        { tabindex: 0, role: 'img', 'aria-label': `Fatia ${rotulo}: probabilidade ${fmt(s.p)}` },
        svg,
      );
      svgEl(
        'rect',
        { x: cx - faixa / 2, y: M.top, width: faixa, height: plotH, fill: 'transparent' },
        g,
      );
      svgEl(
        'path',
        { d, fill: cima ? 'var(--series-ad)' : 'var(--series-normal)', 'data-k': s.k },
        g,
      );
      const entrar = (pos: { clientX: number; clientY: number }) => {
        this.cursor().highlighted.set(s.k);
        this.cursor().set(s.index);
        this.tooltip.show(pos, [
          ['v', fmt(s.p)],
          [
            'l',
            `P(DA) · fatia ${rotulo} (índice ${s.index})`,
            cima ? 'var(--series-ad)' : 'var(--series-normal)',
          ],
          ['l', cima ? 'voto: DA' : 'voto: Normal'],
        ]);
      };
      const sair = () => {
        this.cursor().highlighted.set(null);
        this.tooltip.hide();
      };
      g.addEventListener('pointermove', (ev) => entrar(ev), { passive: true });
      g.addEventListener('focus', () => {
        const b = g.getBoundingClientRect();
        entrar({ clientX: b.right, clientY: b.top });
      });
      g.addEventListener('pointerleave', sair);
      g.addEventListener('blur', sair);
      if (s.offset % 3 === 0) svgText(svg, cx, H - 16, rotulo, { 'text-anchor': 'middle' });
    });

    // limiar e média com rótulo direto na ponta direita; a média desce se colar no limiar
    svgEl(
      'line',
      { x1: M.left, x2: W - M.right, y1: y(0.5), y2: y(0.5), stroke: 'var(--color-text-muted)' },
      svg,
    );
    svgEl(
      'line',
      {
        x1: M.left,
        x2: W - M.right,
        y1: y(mean),
        y2: y(mean),
        stroke: 'var(--color-text)',
        'stroke-width': 1.5,
      },
      svg,
    );
    const perto = Math.abs(y(mean) - y(0.5)) < 16;
    svgText(svg, W - M.right, y(0.5) - 5, 'limiar 0,5', { 'text-anchor': 'end', class: 'value' });
    svgText(svg, W - M.right, perto ? y(mean) + 14 : y(mean) - 5, `média ${fmt(mean)}`, {
      'text-anchor': 'end',
      class: 'value',
    });
    svgText(svg, M.left, H - 1, 'posteriores');
    svgText(svg, W - M.right, H - 1, 'anteriores', { 'text-anchor': 'end' });
  }
}
