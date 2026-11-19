import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../../../../shared/icon/icon';
import { Sample, SamplesService } from '../../../../core/samples';

const DIAGNOSTICO: Record<string, string> = {
  AD: 'doença de Alzheimer',
  CN: 'cognitivamente normal',
  MCI: 'comprometimento cognitivo leve',
};

/** Carrossel dos exames de exemplo do servidor; as setas só aparecem quando há mais do que cabe. */
@Component({
  selector: 'app-sample-carousel',
  imports: [Icon],
  templateUrl: './sample-carousel.html',
  styleUrl: './sample-carousel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SampleCarousel {
  readonly samples = input.required<Sample[]>();
  readonly pick = output<Sample>();

  private readonly samplesService = inject(SamplesService);
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  protected readonly overflowing = signal(false);
  protected readonly atStart = signal(true);
  protected readonly atEnd = signal(false);

  constructor() {
    // Rolagem e redimensionamento observados fora do template (zoneless): os signals só
    // mudam quando o estado das setas muda
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.track().nativeElement;
      const update = () => {
        // folga de alguns pixels: o encaixe da rolagem para no início do cartão, não no zero
        const max = el.scrollWidth - el.clientWidth;
        const overflowing = max > 8;
        const atStart = el.scrollLeft <= 8;
        const atEnd = el.scrollLeft >= max - 8;
        if (overflowing !== this.overflowing()) this.overflowing.set(overflowing);
        if (atStart !== this.atStart()) this.atStart.set(atStart);
        if (atEnd !== this.atEnd()) this.atEnd.set(atEnd);
      };
      el.addEventListener('scroll', update, { passive: true });
      const resize = new ResizeObserver(update);
      resize.observe(el);
      destroyRef.onDestroy(() => {
        el.removeEventListener('scroll', update);
        resize.disconnect();
      });
      update();
    });
  }

  protected step(direction: -1 | 1): void {
    const el = this.track().nativeElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  }

  protected thumbnail(s: Sample): string {
    return this.samplesService.thumbnailUrl(s.id);
  }

  protected clinical(s: Sample): string {
    return DIAGNOSTICO[s.diagnostico_clinico ?? ''] ?? s.diagnostico_clinico ?? 'não informado';
  }

  /** "Feminino, 78 anos"; sem esses dados no manifesto, o tamanho do arquivo. */
  protected person(s: Sample): string {
    const sexo = s.sexo === 'F' ? 'Feminino' : s.sexo === 'M' ? 'Masculino' : '';
    const idade = s.idade != null ? `${s.idade} anos` : '';
    const partes = [sexo, idade].filter(Boolean);
    if (partes.length) return partes.join(', ');
    return `${(s.tamanho_bytes / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  }
}
