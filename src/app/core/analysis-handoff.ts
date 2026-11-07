import { Injectable, signal } from '@angular/core';
import { Sample } from './samples';

export type AnalysisSource = { kind: 'file'; file: File } | { kind: 'sample'; sample: Sample };

/**
 * Guarda o consentimento da sessão, para o termo aparecer uma vez só.
 * Fica só em memória, como diz o termo: recarregar a página começa do zero.
 */
@Injectable({ providedIn: 'root' })
export class AnalysisHandoff {
  readonly consentGiven = signal(false);
  readonly anonymousUseAllowed = signal(false);

  giveConsent(anonymousUse: boolean): void {
    this.consentGiven.set(true);
    this.anonymousUseAllowed.set(anonymousUse);
  }
}
