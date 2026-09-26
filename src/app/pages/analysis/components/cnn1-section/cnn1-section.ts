import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../../../../shared/icon/icon';
import { AnalysisView } from '../../analysis-view';
import { DecodedVolume } from '../../volume/volume-decoder';
import { ScanCursor } from '../../scan-cursor';
import { fmt, prefersReducedMotion } from '../../chart-utils';
import { MriViewer } from '../mri-viewer/mri-viewer';
import { RoiChart } from '../roi-chart/roi-chart';
import { SagittalLocator } from '../sagittal-locator/sagittal-locator';

const FATIAS_POR_SEGUNDO = 90;

@Component({
  selector: 'app-cnn1-section',
  imports: [Icon, MriViewer, RoiChart, SagittalLocator],
  templateUrl: './cnn1-section.html',
  styleUrl: './cnn1-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cnn1Section {
  readonly view = input.required<AnalysisView>();
  readonly volume = input<DecodedVolume | null>(null);
  readonly volumeState = input<'none' | 'loading' | 'ready' | 'error'>('none');
  readonly volumeError = input('');
  readonly cursor = input.required<ScanCursor>();

  protected readonly playing = signal(false);
  protected readonly tableOpen = signal(false);
  protected readonly fmt = fmt;
  private readonly readout = viewChild.required<ElementRef<HTMLElement>>('readout');
  private raf = 0;

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // leitura do cursor escrita direto no DOM (muda a cada quadro durante a reprodução)
      const off = this.cursor().listen((j) => {
        const v = this.view();
        const dentro = j >= v.window[0] && j <= v.window[1];
        this.readout().nativeElement.textContent = `Fatia ${j} · score ${fmt(v.scores[j], 2)}${dentro ? ' · dentro da janela' : ''}`;
      });
      const pausar = () => document.hidden && this.stop();
      document.addEventListener('visibilitychange', pausar);
      destroyRef.onDestroy(() => {
        off();
        this.stop();
        document.removeEventListener('visibilitychange', pausar);
      });
    });
  }

  protected toggle(): void {
    if (this.playing()) return this.stop();
    const v = this.view();
    const cursor = this.cursor();
    if (prefersReducedMotion()) return cursor.set(v.central);
    this.playing.set(true);
    let t0: number | null = null;
    // percorre todas as fatias, como a CNN1, e desliza até a fatia central
    const passo = (t: number) => {
      t0 ??= t;
      const j = ((t - t0) / 1000) * FATIAS_POR_SEGUNDO;
      if (j < v.n) {
        cursor.set(j);
      } else {
        const f = Math.min(1, (t - t0 - (v.n / FATIAS_POR_SEGUNDO) * 1000) / 700);
        const e = 1 - (1 - f) ** 3;
        cursor.set(v.n - 1 + (v.central - (v.n - 1)) * e);
        if (f >= 1) return this.stop();
      }
      this.raf = requestAnimationFrame(passo);
    };
    this.raf = requestAnimationFrame(passo);
  }

  private stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.playing.set(false);
  }
}
