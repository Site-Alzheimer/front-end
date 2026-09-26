import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Icon } from '../../../../shared/icon/icon';
import { Sample, SamplesService } from '../../../../core/samples';
import { AnalysisSource } from '../../../../core/analysis-handoff';
import { sniffNifti } from '../../volume/sniff';

const DIAGNOSTICO: Record<string, string> = {
  AD: 'doença de Alzheimer',
  CN: 'cognitivamente normal',
  MCI: 'comprometimento cognitivo leve',
};

@Component({
  selector: 'app-upload-panel',
  imports: [Icon],
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
      .subscribe({ next: (s) => this.samples.set(s), error: () => this.samples.set([]) });
  }

  protected thumbnail(s: Sample): string {
    return this.samplesService.thumbnailUrl(s.id);
  }

  protected clinical(s: Sample): string {
    return DIAGNOSTICO[s.diagnostico_clinico ?? ''] ?? s.diagnostico_clinico ?? 'não informado';
  }

  protected sizeMb(bytes: number): string {
    return (bytes / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
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
