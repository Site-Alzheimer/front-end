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
import { fmt, niceTicks, svgEl, svgText } from '../../chart-utils';
import { ScanCursor } from '../../scan-cursor';
import { ROI_MARGIN } from '../chart-margin';

const H = 210;
const TOP = 14;
const BOTTOM = 26;

/** Score da CNN1 por fatia coronal (linha única), com limiar, janela, fatia central e cursor. */
@Component({
  selector: 'app-roi-chart',
  template: `<svg #svg class="ui-chart" [attr.height]="height"></svg>`,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoiChart {
  /** Na ordem canônica; NaN = ainda não calculado (varredura ao vivo). */
  readonly scores = input.required<number[]>();
  readonly window = input<[number, number] | null>(null);
  readonly central = input<number | null>(null);
  readonly threshold = input<number | null>(null);
  readonly cursor = input.required<ScanCursor>();
  readonly interactive = input(false);

  protected readonly height = H;
  private readonly svg = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private readonly width = signal(0);
  private readonly tooltip = inject(ChartTooltip);
  private x: (i: number) => number = () => 0;
  private cursorMark: SVGGElement | null = null;
  private hoverLine: SVGLineElement | null = null;

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const ro = new ResizeObserver(([e]) => this.width.set(Math.round(e.contentRect.width)));
      ro.observe(host);
      destroyRef.onDestroy(() => ro.disconnect());
      if (this.interactive()) this.bindInteraction(destroyRef);
    });
    afterRenderEffect(() =>
      this.render(this.scores(), this.window(), this.central(), this.threshold(), this.width()),
    );
    afterRenderEffect((onCleanup) => {
      this.width();
      this.scores();
      onCleanup(this.cursor().listen((j) => this.placeCursor(j)));
    });
  }

  private render(
    scores: number[],
    win: [number, number] | null,
    central: number | null,
    threshold: number | null,
    W: number,
  ): void {
    const svg = this.svg().nativeElement;
    svg.replaceChildren();
    if (!W || !scores.length) return;
    const n = scores.length;
    const plotW = W - ROI_MARGIN.left - ROI_MARGIN.right;
    const plotH = H - TOP - BOTTOM;
    const finitos = scores.filter(Number.isFinite);
    const ticks = niceTicks((finitos.length ? Math.max(...finitos) : 1) * 1.04);
    const yMax = ticks[ticks.length - 1];
    const x = (this.x = (i: number) => ROI_MARGIN.left + ((i + 0.5) / n) * plotW);
    const y = (v: number) => TOP + plotH - (Math.max(0, Math.min(yMax, v)) / yMax) * plotH;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    for (const t of ticks) {
      svgEl(
        'line',
        {
          x1: ROI_MARGIN.left,
          x2: W - ROI_MARGIN.right,
          y1: y(t),
          y2: y(t),
          stroke: t === 0 ? 'var(--chart-axis)' : 'var(--chart-grid)',
        },
        svg,
      );
      svgText(svg, ROI_MARGIN.left - 8, y(t) + 4, fmt(t, 0), { 'text-anchor': 'end' });
    }
    for (let t = 0; t < n; t += 32)
      svgText(svg, x(t), H - 8, String(t), { 'text-anchor': 'middle' });
    if (win) {
      svgEl(
        'rect',
        {
          x: x(win[0]) - plotW / n / 2,
          y: TOP,
          width: ((win[1] - win[0] + 1) * plotW) / n,
          height: plotH,
          fill: 'var(--chart-band)',
        },
        svg,
      );
    }
    if (threshold != null) {
      svgEl(
        'line',
        {
          x1: ROI_MARGIN.left,
          x2: W - ROI_MARGIN.right,
          y1: y(threshold),
          y2: y(threshold),
          stroke: 'var(--color-text-2)',
        },
        svg,
      );
      svgText(
        svg,
        W - ROI_MARGIN.right,
        y(threshold) - 5,
        `limiar ${fmt(threshold, 1)} (80% do máx.)`,
        { 'text-anchor': 'end', class: 'value' },
      );
    }
    // a linha é interrompida onde o score ainda não chegou
    let d = '';
    let aberto = false;
    scores.forEach((v, i) => {
      if (!Number.isFinite(v)) return void (aberto = false);
      d += `${aberto ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      aberto = true;
    });
    if (d)
      svgEl(
        'path',
        {
          d,
          fill: 'none',
          stroke: 'var(--series-ink)',
          'stroke-width': 2,
          'stroke-linejoin': 'round',
          'stroke-linecap': 'round',
        },
        svg,
      );
    if (central != null && Number.isFinite(scores[central])) {
      svgEl(
        'circle',
        {
          cx: x(central),
          cy: y(scores[central]),
          r: 4.5,
          fill: 'var(--series-ink)',
          stroke: '#fff',
          'stroke-width': 2,
        },
        svg,
      );
      svgText(svg, x(central) + 8, y(scores[central]) - 6, `central ${central}`, {
        class: 'value',
      });
    }
    this.cursorMark = svgEl('g', {}, svg);
    svgEl(
      'line',
      { y1: TOP - 2, y2: TOP + plotH, stroke: 'var(--color-primary)', 'stroke-width': 1.5 },
      this.cursorMark,
    );
    svgEl(
      'circle',
      { cy: TOP - 2, r: 4, fill: 'var(--color-primary)', stroke: '#fff', 'stroke-width': 2 },
      this.cursorMark,
    );
    this.hoverLine = svgEl(
      'line',
      { y1: TOP, y2: TOP + plotH, stroke: 'var(--color-text-muted)', 'stroke-opacity': 0.5 },
      svg,
    );
    this.hoverLine.style.display = 'none';
    this.placeCursor(this.cursor().value);
  }

  private placeCursor(j: number): void {
    this.cursorMark?.setAttribute('transform', `translate(${this.x(j)},0)`);
    if (!this.interactive()) return;
    const svg = this.svg().nativeElement;
    const s = this.scores()[j];
    svg.setAttribute('aria-valuemax', String(this.scores().length - 1));
    svg.setAttribute('aria-valuenow', String(j));
    svg.setAttribute(
      'aria-valuetext',
      `fatia ${j}${Number.isFinite(s) ? `, score ${fmt(s, 1)}` : ''}`,
    );
  }

  private bindInteraction(destroyRef: DestroyRef): void {
    const svg = this.svg().nativeElement;
    Object.entries({
      tabindex: '0',
      role: 'slider',
      'aria-label': 'Fatia coronal em foco',
      'aria-valuemin': '0',
    }).forEach(([k, v]) => svg.setAttribute(k, v));
    const indice = (ev: PointerEvent) => {
      const b = svg.getBoundingClientRect();
      const n = this.scores().length;
      const f =
        (ev.clientX - b.left - ROI_MARGIN.left) / (b.width - ROI_MARGIN.left - ROI_MARGIN.right);
      return Math.max(0, Math.min(n - 1, Math.floor(f * n)));
    };
    let arrastando = false;
    const handlers: [string, EventListener][] = [
      [
        'pointerdown',
        ((ev: PointerEvent) => {
          arrastando = true;
          svg.setPointerCapture(ev.pointerId);
          this.cursor().set(indice(ev));
        }) as EventListener,
      ],
      [
        'pointermove',
        ((ev: PointerEvent) => {
          const j = indice(ev);
          if (arrastando) this.cursor().set(j);
          const s = this.scores()[j];
          const w = this.window();
          this.hoverLine?.setAttribute('transform', `translate(${this.x(j)},0)`);
          if (this.hoverLine) this.hoverLine.style.display = '';
          this.tooltip.show(ev, [
            ['v', Number.isFinite(s) ? fmt(s, 2) : '—'],
            ['l', `score da CNN1 · fatia ${j}`, 'var(--series-ink)'],
            ...(w && j >= w[0] && j <= w[1] ? [['l', 'dentro da janela'] as ['l', string]] : []),
          ]);
        }) as EventListener,
      ],
      ['pointerup', () => (arrastando = false)],
      [
        'pointerleave',
        () => {
          if (this.hoverLine) this.hoverLine.style.display = 'none';
          this.tooltip.hide();
        },
      ],
      [
        'keydown',
        ((ev: KeyboardEvent) => {
          const n = this.scores().length;
          const passo = {
            ArrowLeft: -1,
            ArrowDown: -1,
            ArrowRight: 1,
            ArrowUp: 1,
            PageDown: -10,
            PageUp: 10,
          }[ev.key];
          if (ev.key === 'Home' || ev.key === 'End') {
            ev.preventDefault();
            this.cursor().set(ev.key === 'Home' ? 0 : n - 1);
          } else if (passo) {
            ev.preventDefault();
            const j = this.cursor().value + passo * (ev.shiftKey ? 10 : 1);
            this.cursor().set(Math.max(0, Math.min(n - 1, j)));
          }
        }) as EventListener,
      ],
    ];
    for (const [tipo, fn] of handlers)
      svg.addEventListener(tipo, fn, { passive: tipo !== 'keydown' });
    destroyRef.onDestroy(() => handlers.forEach(([tipo, fn]) => svg.removeEventListener(tipo, fn)));
  }
}
