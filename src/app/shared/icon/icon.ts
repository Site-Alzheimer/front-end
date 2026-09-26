import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Ícone do sprite src/assets/svg/sprite.svg (Tabler Icons, MIT).
 * Para adicionar um ícone: salve o .svg em src/assets/svg e rode `node scripts/svg-sprite.mjs`.
 */
@Component({
  selector: 'app-icon',
  template: `<svg aria-hidden="true" focusable="false"><use [attr.href]="href()"></use></svg>`,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
      width: 1.1em;
      height: 1.1em;
      vertical-align: -0.18em;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<string>();
  protected readonly href = computed(() => `assets/svg/sprite.svg#${this.name()}`);
}
