import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../../../../shared/icon/icon';

/**
 * Propósito do site e da pesquisa, embaixo dos exemplos e do envio.
 * Texto provisório: o Dr. Saraiva vai mandar o texto definitivo.
 */
@Component({
  selector: 'app-research-note',
  imports: [Icon],
  template: `
    <aside class="ui-card note" aria-labelledby="pesquisa-titulo">
      <p class="note__title" id="pesquisa-titulo"><app-icon name="info-circle" />Sobre a pesquisa</p>
      <p class="note__text">
        O NeuroIA leva ao navegador o modelo de inteligência artificial desenvolvido pelo grupo do
        Dr. Raimundo Guimarães Saraiva Junior (IFCE) para apoiar a pesquisa sobre o diagnóstico da
        doença de Alzheimer em ressonância magnética estrutural. A CNN1 escolhe as fatias coronais da
        região do hipocampo e a CNN2 classifica 19 delas; o treinamento usou exames do ADNI1
        Screening 1.5T. O resultado é uma estimativa estatística feita a partir de padrões de imagem
        e pode conter falsos positivos e falsos negativos. <b>Não é diagnóstico médico</b>: qualquer
        conclusão clínica exige a avaliação completa de um profissional habilitado.
      </p>
    </aside>
  `,
  styleUrl: './research-note.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResearchNote {}
