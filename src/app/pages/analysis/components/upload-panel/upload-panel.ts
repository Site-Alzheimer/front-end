import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Icon } from '../../../../shared/icon/icon';
import { ResearchNote } from '../research-note/research-note';
import { SampleCarousel } from '../sample-carousel/sample-carousel';
import { Sample, SamplesService } from '../../../../core/samples';
import { AnalysisSource } from '../../../../core/analysis-handoff';
import { sniffNifti } from '../../volume/sniff';

// Provisório: cada amostra repetida 10 vezes, para ver o carrossel cheio. Voltar para 1 antes de
// publicar amostras abertas no servidor.
const REPETICOES_AMOSTRAS = 10;

@Component({
  selector: 'app-upload-panel',
  imports: [Icon, ResearchNote, SampleCarousel],
  templateUrl: './upload-panel.html',
  styleUrl: './upload-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadPanel {
  readonly start = output<AnalysisSource>();

  private readonly samplesService = inject(SamplesService);
  protected readonly samples = signal<Sample[] | null>(null);
  protected readonly dragging = signal(false);
  protected readonly checking = signal(false);
  protected readonly problem = signal<string | null>(null);

  constructor() {
    this.samplesService
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (s) => this.samples.set(Array.from({ length: REPETICOES_AMOSTRAS }, () => s).flat()),
        error: () => this.samples.set([]),
      });
  }

  protected onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.dragging.set(false);
    const file = ev.dataTransfer?.files?.[0];
    if (file) void this.check(file);
  }

  protected onPick(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.check(file);
  }

  protected useSample(sample: Sample): void {
    this.start.emit({ kind: 'sample', sample });
  }

  // Confere extensão e bytes mágicos no navegador: um arquivo errado nem chega a ser enviado
  private async check(file: File): Promise<void> {
    this.problem.set(null);
    this.checking.set(true);
    const r = await sniffNifti(file);
    this.checking.set(false);
    if (r.ok) this.start.emit({ kind: 'file', file });
    else this.problem.set(`${file.name}: ${r.reason}`);
  }
}
