import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import { Icon } from '../../../../shared/icon/icon';
import { AnalysisView } from '../../analysis-view';
import { ScanCursor } from '../../scan-cursor';
import { fmt } from '../../chart-utils';
import { SliceBars } from '../slice-bars/slice-bars';
import { SliceGrid, SpriteInfo } from '../slice-grid/slice-grid';

@Component({
  selector: 'app-cnn2-section',
  imports: [Icon, SliceBars, SliceGrid],
  templateUrl: './cnn2-section.html',
  styleUrl: './cnn2-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cnn2Section {
  readonly view = input.required<AnalysisView>();
  readonly cursor = input.required<ScanCursor>();

  protected readonly asCnnSees = signal(false);
  protected readonly showHeat = signal(false);
  protected readonly heatOpacity = signal(0.75);
  protected readonly tableOpen = signal(false);
  protected readonly fmt = fmt;
  private readonly spriteUrl = signal<string | null>(null);

  protected readonly sprite = computed<SpriteInfo | null>(() => {
    const img = this.view().images;
    const url = this.spriteUrl();
    return img && url
      ? { url, columns: img.columns, rows: img.rows, transform: img.cnn2Transform }
      : null;
  });

  /** Cada mapa da Grad-CAM vira uma imagem h×w de um tom só: a cor da classe explicada. */
  protected readonly heatUrls = computed<string[] | null>(() => {
    const g = this.view().gradcam;
    if (!g || typeof document === 'undefined') return null;
    const [r, gr, b] = g.targetIsAd ? [235, 104, 52] : [42, 120, 214];
    const canvas = document.createElement('canvas');
    canvas.width = g.w;
    canvas.height = g.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return g.maps.map((mapa) => {
      const img = ctx.createImageData(g.w, g.h);
      mapa.forEach((v, i) => {
        img.data.set([r, gr, b, Math.round(Math.pow(v, 0.9) * 220)], i * 4);
      });
      ctx.putImageData(img, 0, 0);
      return canvas.toDataURL();
    });
  });
  protected readonly heatClass = computed(() => {
    const g = this.view().gradcam;
    return g ? (g.targetIsAd ? 'DA' : 'Normal') : '';
  });

  constructor() {
    // Uma blob URL para as 19 miniaturas (em vez de repetir ~450 kB de data URL em cada uma)
    effect((onCleanup) => {
      const dataUrl = this.view().images?.sprite;
      if (!dataUrl) return;
      let url: string | null = null;
      let vivo = true;
      fetch(dataUrl)
        .then((r) => r.blob())
        .then((b) => {
          if (!vivo) return;
          url = URL.createObjectURL(b);
          this.spriteUrl.set(url);
        });
      onCleanup(() => {
        vivo = false;
        if (url) URL.revokeObjectURL(url);
        this.spriteUrl.set(null);
      });
    });
  }

  protected label(offset: number): string {
    return offset === 0 ? 'central' : `${offset > 0 ? '+' : '−'}${Math.abs(offset)}`;
  }
}
