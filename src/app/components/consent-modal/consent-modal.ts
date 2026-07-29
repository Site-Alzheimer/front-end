import { DOCUMENT } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, output, signal } from '@angular/core';

@Component({
  selector: 'app-consent-modal',
  imports: [],
  templateUrl: './consent-modal.html',
  styleUrl: './consent-modal.css',
})
export class ConsentModal implements OnInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private previousBodyOverflow = '';

  readonly accepted = output<void>();
  readonly closed = output<void>();

  protected readonly requiredTerms = [
    'Compreendo que esta ferramenta não realiza diagnóstico médico. O resultado é uma estimativa estatística baseada em padrões de imagem, não uma conclusão clínica.',
    'Estou ciente de que o sistema pode apresentar falsos positivos e falsos negativos, e que o resultado não confirma nem descarta uma doença.',
    'Entendo que qualquer diagnóstico requer avaliação clínica completa por um profissional habilitado.',
    'Compreendo que o resultado pode ser emocionalmente impactante e me comprometo a buscar acompanhamento profissional antes de tomar decisões.',
    'Tenho ciência de que esta plataforma não oferece suporte clínico ou psicológico.',
    'Sou titular dos dados de saúde enviados ou possuo autorização expressa do titular para realizar este envio.',
    'Estou ciente de que a imagem enviada contém dados sensíveis de saúde e será utilizada somente para o processamento solicitado.',
  ];

  protected readonly checkedTerms = signal<boolean[]>(
    this.requiredTerms.map(() => false),
  );
  protected readonly optionalAccepted = signal(false);
  protected readonly acceptedCount = computed(
    () => this.checkedTerms().filter(Boolean).length,
  );
  protected readonly allRequiredAccepted = computed(
    () => this.acceptedCount() === this.requiredTerms.length,
  );

  ngOnInit(): void {
    this.previousBodyOverflow = this.document.body.style.overflow;
    this.document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousBodyOverflow;
  }

  protected toggleRequired(index: number, checked: boolean): void {
    this.checkedTerms.update((terms) =>
      terms.map((value, position) => position === index ? checked : value),
    );
  }

  protected confirm(): void {
    if (this.allRequiredAccepted()) {
      this.accepted.emit();
    }
  }
}
