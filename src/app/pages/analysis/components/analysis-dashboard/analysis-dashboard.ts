import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Icon } from '../../../../shared/icon/icon';
import { AnalysisStore } from '../../analysis.store';
import { ScanCursor } from '../../scan-cursor';
import { fmt } from '../../chart-utils';
import { Cnn1Section } from '../cnn1-section/cnn1-section';
import { Cnn2Section } from '../cnn2-section/cnn2-section';
import { ResultSummary } from '../result-summary/result-summary';

@Component({
  selector: 'app-analysis-dashboard',
  imports: [Icon, ResultSummary, Cnn1Section, Cnn2Section],
  providers: [ScanCursor],
  templateUrl: './analysis-dashboard.html',
  styleUrl: './analysis-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisDashboard {
  protected readonly store = inject(AnalysisStore);
  protected readonly cursor = inject(ScanCursor);
  protected readonly view = computed(() => this.store.view()!);
  protected readonly activeSection = signal('s-resultado');
  protected readonly fmt = fmt;

  protected readonly sections = [
    { id: 's-resultado', label: 'Resultado' },
    { id: 's-cnn1', label: 'CNN1 · corte coronal' },
    { id: 's-cnn2', label: 'CNN2 · classificação' },
  ];

  constructor() {
    this.cursor.set(this.view().central);
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      // tempo de resposta do TCC (do fim do upload ao painel desenhado); sai só no JSON exportado
      this.store.markRendered();
      const obs = new IntersectionObserver(
        (entradas) =>
          entradas
            .filter((e) => e.isIntersecting)
            .forEach((e) => this.activeSection.set(e.target.id)),
        { rootMargin: '-30% 0px -60% 0px' },
      );
      host.querySelectorAll('section[id]').forEach((s: Element) => obs.observe(s));
      destroyRef.onDestroy(() => obs.disconnect());
    });
  }

  protected scrollTo(id: string, ev: Event): void {
    ev.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Baixa os números da análise (sem as imagens). */
  protected exportJson(): void {
    const r = this.store.response();
    if (!r) return;
    const { imagens, ...dados } = r;
    const blob = new Blob(
      [
        JSON.stringify(
          { arquivo: this.store.fileName(), ...dados, tempos_cliente_ms: this.store.timings() },
          null,
          2,
        ),
      ],
      {
        type: 'application/json',
      },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `analise-${this.store.fileName().replace(/\.nii(\.gz)?$/i, '')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
}
