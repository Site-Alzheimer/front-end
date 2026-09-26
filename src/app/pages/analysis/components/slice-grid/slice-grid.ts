import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { SliceEntry } from '../../analysis-view';
import { ScanCursor } from '../../scan-cursor';
import { fmt, shortP } from '../../chart-utils';

export interface SpriteInfo {
  /** blob: URL do sprite (uma só imagem para as 19 fatias). */
  url: string;
  columns: number;
  rows: number;
  transform: string;
}

/** As 19 entradas da CNN2 no arranjo da Fig. 5.15 da tese: posteriores, central, anteriores. */
@Component({
  selector: 'app-slice-grid',
  imports: [NgTemplateOutlet],
  templateUrl: './slice-grid.html',
  styleUrl: './slice-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliceGrid {
  readonly slices = input.required<SliceEntry[]>();
  readonly sprite = input<SpriteInfo | null>(null);
  /** true = como a CNN recebe; false = girada para a orientação anatômica. */
  readonly asCnnSees = input(false);
  readonly cursor = input.required<ScanCursor>();
  /** Grad-CAM por posição do lote (data URLs pequenas), ou null para esconder. */
  readonly heat = input<string[] | null>(null);
  readonly heatOpacity = input(0.75);

  protected readonly posterior = computed(() => this.slices().filter((s) => s.offset < 0));
  protected readonly anterior = computed(() => this.slices().filter((s) => s.offset > 0));
  protected readonly center = computed(
    () => this.slices().find((s) => s.offset === 0) ?? this.slices()[9],
  );
  protected readonly highlighted = computed(() => this.cursor().highlighted());
  protected readonly fmt = fmt;
  protected readonly shortP = shortP;

  protected position(s: SliceEntry): string {
    const sp = this.sprite();
    if (!sp) return '';
    const col = s.k % sp.columns;
    const row = Math.floor(s.k / sp.columns);
    return `${(col / (sp.columns - 1)) * 100}% ${(row / (sp.rows - 1)) * 100}%`;
  }

  protected size(): string {
    const sp = this.sprite();
    return sp ? `${sp.columns * 100}% ${sp.rows * 100}%` : '';
  }

  protected label(s: SliceEntry): string {
    return s.offset === 0 ? 'central' : `${s.offset > 0 ? '+' : '−'}${Math.abs(s.offset)}`;
  }

  protected focus(s: SliceEntry | null): void {
    this.cursor().highlighted.set(s ? s.k : null);
    if (s) this.cursor().set(s.index);
  }
}
