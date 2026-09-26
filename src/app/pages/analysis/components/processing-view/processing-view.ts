import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  effect,
  inject,
} from '@angular/core';
import { Icon } from '../../../../shared/icon/icon';
import { AnalysisStore, StepKey } from '../../analysis.store';
import { ScanCursor } from '../../scan-cursor';
import { fmt, prefersReducedMotion } from '../../chart-utils';
import { MriViewer } from '../mri-viewer/mri-viewer';
import { RoiChart } from '../roi-chart/roi-chart';
import { SagittalLocator } from '../sagittal-locator/sagittal-locator';

const ORDEM: StepKey[] = ['upload', 'load', 'cnn1', 'extract', 'cnn2', 'done'];
const NOMES: Record<StepKey, string> = {
  upload: 'Envio do exame',
  load: 'Leitura do volume',
  cnn1: 'CNN1 · varredura coronal',
  extract: 'Extração das 19 fatias',
  cnn2: 'CNN2 · classificação',
  done: 'Resultado',
};

@Component({
  selector: 'app-processing-view',
  imports: [Icon, MriViewer, RoiChart, SagittalLocator],
  providers: [ScanCursor],
  templateUrl: './processing-view.html',
  styleUrl: './processing-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessingView {
  protected readonly store = inject(AnalysisStore);
  protected readonly cursor = inject(ScanCursor);
  private target = 0;
  private shown = 0;
  private started = false;

  protected readonly steps = computed(() => {
    const atual = ORDEM.indexOf(this.store.step());
    const s = this.store.source();
    const upload = this.store.upload();
    const cnn1 = this.store.cnn1();
    return ORDEM.filter((k) => k !== 'upload' || s?.kind === 'file').map((k) => {
      const i = ORDEM.indexOf(k);
      let detalhe = '';
      if (k === 'upload' && upload.total)
        detalhe = `${fmt(upload.loaded / 1e6, 1)} de ${fmt(upload.total / 1e6, 1)} MB`;
      if (k === 'cnn1' && cnn1.total) detalhe = `${cnn1.done} / ${cnn1.total} fatias`;
      if (k === 'cnn2' && i < atual) detalhe = '19 / 19 fatias';
      return {
        key: k,
        name: NOMES[k],
        state: i < atual ? 'done' : i === atual ? 'active' : 'wait',
        detail: detalhe,
        fraction: k === 'upload' && upload.total ? upload.loaded / upload.total : null,
      };
    });
  });

  protected readonly scores = computed(() => {
    const live = this.store.liveScores();
    return live.length ? live : new Array<number>(this.store.cnn1().total || 256).fill(NaN);
  });

  constructor() {
    // A fatia mostrada persegue a que a CNN1 acabou de avaliar (os lotes chegam de 32 em 32)
    effect(() => {
      const { done, total } = this.store.cnn1();
      if (!total) return;
      // a varredura vai da fatia mais posterior (0) para a mais anterior
      this.started = true;
      this.target = done - 1;
      if (prefersReducedMotion()) this.cursor.set(this.target);
    });
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (prefersReducedMotion()) return;
      let raf = 0;
      let t0 = performance.now();
      const passo = (t: number) => {
        const dt = Math.min(64, t - t0);
        t0 = t;
        if (this.started) {
          const falta = this.target - this.shown;
          // no máximo ~160 fatias/s: rápido o bastante para acompanhar, lento o bastante para ver
          this.shown += Math.sign(falta) * Math.min(Math.abs(falta), (160 * dt) / 1000);
          this.cursor.set(this.shown);
        }
        raf = requestAnimationFrame(passo);
      };
      raf = requestAnimationFrame(passo);
      destroyRef.onDestroy(() => cancelAnimationFrame(raf));
    });
  }
}
