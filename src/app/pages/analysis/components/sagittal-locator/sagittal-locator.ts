import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  viewChild,
} from '@angular/core';
import { DecodedVolume } from '../../volume/volume-decoder';
import { ScanCursor } from '../../scan-cursor';
import { ROI_MARGIN, sliceLeft, sliceWidth } from '../chart-margin';

/** Corte sagital médio com a janela da CNN1 e o cursor, alinhado ao eixo do gráfico. */
@Component({
  selector: 'app-sagittal-locator',
  template: `
    <canvas
      #canvas
      [hidden]="!volume()"
      [style.left.px]="margin.left"
      [style.right.px]="margin.right"
    ></canvas>
    @if (!volume()) {
      <span class="empty">corte sagital médio</span>
    }
    @if (band(); as b) {
      <div class="band" [style.left]="b.left" [style.width]="b.width"></div>
    }
    <div #line class="line"></div>
  `,
  styleUrl: './sagittal-locator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SagittalLocator {
  readonly volume = input<DecodedVolume | null>(null);
  readonly n = input.required<number>();
  readonly window = input<[number, number] | null>(null);
  readonly cursor = input.required<ScanCursor>();

  protected readonly margin = ROI_MARGIN;
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly line = viewChild.required<ElementRef<HTMLElement>>('line');

  protected readonly band = computed(() => {
    const w = this.window();
    const n = this.n();
    if (!w || !n) return null;
    return { left: sliceLeft(w[0] - 0.5, n), width: sliceWidth(w[1] - w[0] + 1, n) };
  });

  constructor() {
    afterRenderEffect(() => {
      const v = this.volume();
      if (v) this.drawSagittal(v);
    });
    afterRenderEffect((onCleanup) => {
      const n = this.n();
      const line = this.line().nativeElement;
      onCleanup(this.cursor().listen((j) => (line.style.left = sliceLeft(j, n))));
    });
  }

  private drawSagittal(v: DecodedVolume): void {
    const [nx, ny, nz] = v.dims;
    const x = Math.floor(nx / 2);
    const canvas = this.canvas().nativeElement;
    canvas.width = ny;
    canvas.height = nz;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = ctx.createImageData(ny, nz);
    const px = img.data;
    for (let r = 0; r < nz; r++) {
      const z = nz - 1 - r;
      for (let y = 0; y < ny; y++) {
        const g = v.voxels[x + nx * (z + nz * y)];
        const o = (r * ny + y) * 4;
        px[o] = px[o + 1] = px[o + 2] = g;
        px[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
}
