import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { pct } from '../../chart-utils';

const R = 48;
const C = 2 * Math.PI * R;
const GAP = 2; // espaço na cor da superfície entre os dois arcos

/** Probabilidade média por classe (Normal × DA) em rosca, com a classe vencedora no centro. */
@Component({
  selector: 'app-class-donut',
  template: `
    <div
      class="donut"
      role="img"
      [attr.aria-label]="
        'Probabilidade média: Normal ' + pct(1 - pAd()) + '%, Alzheimer ' + pct(pAd()) + '%'
      "
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        @for (a of arcs(); track a.cls) {
          <circle
            cx="60"
            cy="60"
            r="48"
            transform="rotate(-90 60 60)"
            [attr.class]="'arc arc--' + a.cls"
            [attr.stroke-dasharray]="a.dash"
            [attr.stroke-dashoffset]="a.offset"
          />
        }
      </svg>
      <span class="donut__center">
        <b>{{ pct(isAd() ? pAd() : 1 - pAd()) }}<small>%</small></b>
        <span>{{ isAd() ? 'Alzheimer' : 'Normal' }}</span>
      </span>
    </div>
    <ul class="legend ui-num">
      <li>
        <i class="ui-key ui-key--normal"></i>Normal<b>{{ pct(1 - pAd()) }}%</b>
      </li>
      <li>
        <i class="ui-key ui-key--ad"></i>Alzheimer<b>{{ pct(pAd()) }}%</b>
      </li>
    </ul>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px 28px;
    }

    .donut {
      position: relative;
      width: 136px;
      height: 136px;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
    }

    .arc {
      fill: none;
      stroke-width: 14;

      &--normal {
        stroke: var(--series-normal);
      }
      &--ad {
        stroke: var(--series-ad);
      }
    }

    .donut__center {
      position: absolute;
      inset: 0;
      display: grid;
      place-content: center;
      text-align: center;

      b {
        font-size: 1.3rem;
        font-weight: 600;
        letter-spacing: -0.01em;
      }
      small {
        font-size: 0.8rem;
        font-weight: 500;
      }
      span {
        font-size: 0.76rem;
        color: var(--color-text-muted);
      }
    }

    .legend {
      display: grid;
      gap: 10px;
      min-width: 150px;
      margin: 0;
      padding: 0;
      list-style: none;
      font-size: 0.86rem;
      color: var(--color-text-2);

      li {
        display: grid;
        grid-template-columns: 10px 1fr auto;
        align-items: center;
        gap: 8px;
      }
      b {
        font-weight: 600;
        color: var(--color-text);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassDonut {
  /** Probabilidade média de DA (0–1). */
  readonly pAd = input.required<number>();
  readonly isAd = input.required<boolean>();

  protected readonly pct = pct;

  /** Arco de DA a partir do topo, no sentido horário, e o de Normal em seguida. */
  protected readonly arcs = computed(() => {
    const la = this.pAd() * C;
    const ln = C - la;
    if (la < GAP * 1.5) return [{ cls: 'normal', dash: `${C} 0`, offset: 0 }];
    if (ln < GAP * 1.5) return [{ cls: 'ad', dash: `${C} 0`, offset: 0 }];
    return [
      { cls: 'ad', dash: `${la - GAP} ${C}`, offset: 0 },
      { cls: 'normal', dash: `${ln - GAP} ${C}`, offset: -la },
    ];
  });
}
