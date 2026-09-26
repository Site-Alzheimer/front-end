import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { fmt } from '../../chart-utils';

// Faixas do coeficiente de variação usadas pelo back (classificacao_cv)
const FAIXAS = [
  { nome: 'Alta precisão', faixa: '< 0,10', min: 0, max: 0.1 },
  { nome: 'Precisão aceitável', faixa: '0,10–0,15', min: 0.1, max: 0.15 },
  { nome: 'Variabilidade moderada', faixa: '0,15–0,20', min: 0.15, max: 0.2 },
  { nome: 'Alta variabilidade', faixa: '≥ 0,20', min: 0.2, max: 0.3 },
];

/** Medidor vertical da consistência entre as 19 fatias, com o marcador na posição do CV. */
@Component({
  selector: 'app-cv-gauge',
  template: `
    <div
      class="gauge"
      role="img"
      [attr.aria-label]="'Coeficiente de variação ' + fmt(cv()) + ': ' + faixas[band()].nome"
    >
      <div class="track">
        @for (b of faixas; track b.nome) {
          <i [class.is-current]="$index === band()"></i>
        }
        <span class="marker" [style.top.%]="markerTop()"></span>
      </div>
      <ul class="labels">
        @for (b of faixas; track b.nome) {
          <li [class.is-current]="$index === band()">
            <span>{{ b.nome }}</span
            ><small class="ui-num">{{ b.faixa }}</small>
          </li>
        }
      </ul>
    </div>
    <p class="foot ui-num">
      coeficiente de variação <b>{{ fmt(cv()) }}</b> · desvio padrão <b>{{ fmt(sd(), 4) }}</b>
    </p>
  `,
  styles: `
    :host {
      display: block;
    }

    .gauge {
      display: grid;
      grid-template-columns: 14px 1fr;
      gap: 16px;
    }

    // Degradê de verde (consistente) a vermelho (variável). A cor é reforço: o nome da faixa,
    // o negrito e o marcador dizem o mesmo. As faixas fora da atual ficam esmaecidas.
    .track {
      position: relative;
      display: grid;
      grid-template-rows: repeat(4, 1fr);
      border-radius: 7px;
      background: linear-gradient(
        to bottom,
        #13a58c 0%,
        #3cb95f 22%,
        #a8c93a 42%,
        #f3b41b 62%,
        #f07a26 81%,
        #df4540 100%
      );

      i {
        background: rgba(255, 255, 255, 0.55);
        box-shadow: inset 0 -2px 0 var(--color-surface); // separação de 2 px entre as faixas

        &:first-child {
          border-radius: 7px 7px 0 0;
        }
        &:last-of-type {
          border-radius: 0 0 7px 7px;
          box-shadow: none;
        }
        &.is-current {
          background: transparent;
        }
      }
    }

    .marker {
      position: absolute;
      left: -5px;
      right: -5px;
      height: 3px;
      margin-top: -1.5px;
      border-radius: 2px;
      background: var(--color-text);
      box-shadow: 0 0 0 2px var(--color-surface);
    }

    .labels {
      display: grid;
      grid-template-rows: repeat(4, 1fr);
      margin: 0;
      padding: 0;
      list-style: none;

      li {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        padding: 7px 0;
        font-size: 0.84rem;
        color: var(--color-text-muted);
      }
      li.is-current {
        font-weight: 600;
        color: var(--color-text);
      }
      small {
        font-size: 0.76rem;
        font-weight: 400;
        color: var(--color-text-muted);
      }
    }

    .foot {
      margin: 12px 0 0;
      font-size: 0.8rem;
      color: var(--color-text-muted);

      b {
        font-weight: 600;
        color: var(--color-text-2);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CvGauge {
  readonly cv = input.required<number>();
  readonly sd = input.required<number>();

  protected readonly fmt = fmt;
  protected readonly faixas = FAIXAS;
  protected readonly band = computed(() => {
    const cv = this.cv();
    return cv < 0.1 ? 0 : cv < 0.15 ? 1 : cv < 0.2 ? 2 : 3;
  });
  /** Posição do marcador na trilha (0% = topo): no miolo da faixa atual, linear dentro dela. */
  protected readonly markerTop = computed(() => {
    const i = this.band();
    const { min, max } = FAIXAS[i];
    const f = Math.min(1, Math.max(0, (this.cv() - min) / (max - min)));
    return ((i + 0.25 + 0.5 * f) / FAIXAS.length) * 100;
  });
}
