import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { Icon } from '../icon/icon';

/** Botão fixo no canto superior direito que volta ao topo depois de rolar a página. */
@Component({
  selector: 'app-back-to-top',
  imports: [Icon],
  template: `
    <button
      type="button"
      class="back-to-top"
      [class.is-visible]="visible()"
      [attr.tabindex]="visible() ? null : -1"
      [attr.aria-hidden]="visible() ? null : true"
      aria-label="Voltar ao topo da página"
      title="Voltar ao topo"
      (click)="toTop()"
    >
      <app-icon name="arrow-up" />
    </button>
  `,
  styleUrl: './back-to-top.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackToTop {
  protected readonly visible = signal(false);

  constructor() {
    // Listener passivo fora do template, como na navbar: no modo zoneless, um listener de
    // scroll no template agendaria detecção de mudanças a cada evento.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const onScroll = () => {
        const visible = window.scrollY > 400;
        if (visible !== this.visible()) this.visible.set(visible);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
      onScroll();
    });
  }

  protected toTop(): void {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }
}
