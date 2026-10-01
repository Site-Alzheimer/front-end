import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Icon } from '../../shared/icon/icon';
import { Sample, SamplesService } from '../../core/samples';
import { AnalysisHandoff } from '../../core/analysis-handoff';

const DIAGNOSTICO_CLINICO: Record<string, string> = {
  AD: 'doença de Alzheimer',
  CN: 'cognitivamente normal',
  MCI: 'comprometimento cognitivo leve',
};

@Component({
  selector: 'app-downloads',
  imports: [Icon],
  templateUrl: './downloads.html',
  styleUrl: './downloads.css',
})
export class Downloads {
  private readonly samplesService = inject(SamplesService);
  private readonly handoff = inject(AnalysisHandoff);
  private readonly router = inject(Router);

  protected readonly itemsPerPage = 4;
  protected readonly samples = signal<Sample[]>([]);
  protected readonly samplesState = signal<'loading' | 'ready' | 'error'>('loading');
  // Servidor sem amostras (site público sem exames com licença aberta): a seção vira só o envio
  protected readonly showSamples = computed(
    () => !(this.samplesState() === 'ready' && this.samples().length === 0),
  );

  constructor() {
    this.samplesService
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (samples) => {
          this.samples.set(samples);
          this.samplesState.set('ready');
        },
        error: () => this.samplesState.set('error'),
      });
  }

  // Divide as amostras em páginas de 4 em 4 para o carrossel
  protected readonly pages = computed<Sample[][]>(() => {
    const chunks: Sample[][] = [];
    const samples = this.samples();
    for (let i = 0; i < samples.length; i += this.itemsPerPage) {
      chunks.push(samples.slice(i, i + this.itemsPerPage));
    }
    return chunks;
  });

  protected readonly currentPage = signal(0);

  protected readonly totalPages = computed(() => this.pages().length);

  protected next(): void {
    const total = this.totalPages();
    this.currentPage.set((this.currentPage() + 1) % total);
  }

  protected prev(): void {
    const total = this.totalPages();
    this.currentPage.set((this.currentPage() - 1 + total) % total);
  }

  protected goTo(index: number): void {
    this.currentPage.set(index);
  }

  protected thumbnailUrl(sample: Sample): string {
    return this.samplesService.thumbnailUrl(sample.id);
  }

  protected clinicalLabel(sample: Sample): string {
    return (
      DIAGNOSTICO_CLINICO[sample.diagnostico_clinico ?? ''] ??
      sample.diagnostico_clinico ??
      'não informado'
    );
  }

  // Amostras abrem a análise direto; o termo só aparece quando o usuário envia o próprio exame
  protected analyzeSample(sample: Sample): void {
    this.handoff.queue({ kind: 'sample', sample });
    void this.router.navigate(['/analise']);
  }

  protected uploadOwn(): void {
    this.handoff.queue(null);
    void this.router.navigate(['/analise']);
  }
}
