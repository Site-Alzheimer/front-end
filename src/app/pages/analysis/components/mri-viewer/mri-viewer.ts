import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../../../../shared/icon/icon';
import { Crop } from '../../analysis.models';
import { DecodedVolume } from '../../volume/volume-decoder';
import { ScanCursor } from '../../scan-cursor';
import { svgEl } from '../../chart-utils';

// cinza → RGBA (Uint32 little-endian), montado uma vez
const LUT = new Uint32Array(256).map((_, g) => (0xff000000 | (g << 16) | (g << 8) | g) >>> 0);

/** Fatia coronal do volume canônico, em convenção neurológica (S em cima, E à esquerda). */
@Component({
  selector: 'app-mri-viewer',
  imports: [Icon],
  templateUrl: './mri-viewer.html',
  styleUrl: './mri-viewer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MriViewer {
  readonly volume = input<DecodedVolume | null>(null);
  readonly volumeState = input<'none' | 'loading' | 'ready' | 'error'>('none');
  readonly volumeError = input('');
  readonly cursor = input.required<ScanCursor>();
  readonly crops = input<{ cnn1?: Crop; cnn2?: Crop } | null>(null);
  readonly showCropToggles = input(false);

  protected readonly showCnn1 = signal(true);
  protected readonly showCnn2 = signal(true);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly overlay = viewChild.required<ElementRef<SVGSVGElement>>('overlay');
  private readonly label = viewChild.required<ElementRef<HTMLElement>>('label');
  private image: ImageData | null = null;

  /** Largura do quadro que mantém a proporção física (mm) do corte. */
  protected readonly frameWidth = computed(() => {
    const v = this.volume();
    if (!v) return null;
    const ratio = (v.dims[0] * v.spacing[0]) / (v.dims[2] * v.spacing[2]);
    return `min(100%, ${Math.round(360 * ratio)}px)`;
  });
  protected readonly aspect = computed(() => {
    const v = this.volume();
    return v ? `${v.dims[0] * v.spacing[0]} / ${v.dims[2] * v.spacing[2]}` : null;
  });

  constructor() {
    afterRenderEffect((onCleanup) => {
      const v = this.volume();
      const cursor = this.cursor();
      this.image = null;
      if (!v) return;
      onCleanup(cursor.listen((j) => this.draw(v, j)));
    });
    afterRenderEffect(() =>
      this.drawCrops(this.volume(), this.crops(), this.showCnn1(), this.showCnn2()),
    );
  }

  private draw(v: DecodedVolume, j: number): void {
    const [nx, ny, nz] = v.dims;
    const y = Math.max(0, Math.min(ny - 1, j));
    const canvas = this.canvas().nativeElement;
    if (canvas.width !== nx || canvas.height !== nz) {
      canvas.width = nx;
      canvas.height = nz;
      this.image = null;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = (this.image ??= ctx.createImageData(nx, nz));
    const px = new Uint32Array(img.data.buffer);
    const base = y * nx * nz;
    for (let r = 0; r < nz; r++) {
      const src = base + (nz - 1 - r) * nx; // linha de cima = mais superior
      const dst = r * nx;
      for (let x = 0; x < nx; x++) px[dst + x] = LUT[v.voxels[src + x]];
    }
    ctx.putImageData(img, 0, 0);
    this.label().nativeElement.textContent = String(y);
  }

  private drawCrops(
    v: DecodedVolume | null,
    crops: { cnn1?: Crop; cnn2?: Crop } | null,
    c1: boolean,
    c2: boolean,
  ): void {
    const svg = this.overlay().nativeElement;
    svg.replaceChildren();
    if (!v || !crops) return;
    const [nx, , nz] = v.dims;
    svg.setAttribute('viewBox', `0 0 ${nx} ${nz}`);
    const faixas: [Crop | undefined, boolean, string][] = [
      [crops.cnn1, c1, 'var(--crop-cnn1)'],
      [crops.cnn2, c2, 'var(--crop-cnn2)'],
    ];
    for (const [crop, visivel, cor] of faixas) {
      if (!crop || !visivel) continue;
      // x canônico = coluna; z canônico = nz − linha
      const [x0, y0, x1, y1] =
        crop.eixo === 'x'
          ? [crop.inicio, 0, crop.fim, nz]
          : [0, nz - crop.fim, nx, nz - crop.inicio];
      svgEl(
        'rect',
        {
          x: x0 + 0.5,
          y: y0 + 0.5,
          width: Math.max(0, x1 - x0 - 1),
          height: Math.max(0, y1 - y0 - 1),
          fill: 'none',
          stroke: cor,
          'stroke-width': 1.5,
          'vector-effect': 'non-scaling-stroke',
        },
        svg,
      );
    }
  }
}
