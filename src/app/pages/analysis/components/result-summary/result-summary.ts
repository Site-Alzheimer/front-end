import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AnalysisView, SliceEntry } from '../../analysis-view';
import { fmt } from '../../chart-utils';
import { ClassDonut } from '../class-donut/class-donut';
import { CvGauge } from '../cv-gauge/cv-gauge';

/** Resultado em 2×2: classificação e probabilidade por classe; consistência e votos. */
@Component({
  selector: 'app-result-summary',
  imports: [ClassDonut, CvGauge],
  templateUrl: './result-summary.html',
  styleUrl: './result-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultSummary {
  readonly view = input.required<AnalysisView>();

  protected readonly isAd = computed(() => this.view().diagnosis === 'ALZHEIMER');

  protected sliceTitle(s: SliceEntry): string {
    const pos = s.offset === 0 ? 'central' : `${s.offset > 0 ? '+' : '−'}${Math.abs(s.offset)}`;
    return `Fatia ${pos}: P(DA) ${fmt(s.p)}`;
  }
}
