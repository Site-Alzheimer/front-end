import { Injectable, signal } from '@angular/core';
import { Sample } from './samples';

export type AnalysisSource = { kind: 'file'; file: File } | { kind: 'sample'; sample: Sample };

/**
 * Passa o consentimento e o exame escolhido na home para a rota /analise.
 * Fica só em memória, como diz o termo: recarregar a página começa do zero.
 */
@Injectable({ providedIn: 'root' })
export class AnalysisHandoff {
  readonly consentGiven = signal(false);
  readonly anonymousUseAllowed = signal(false);
  private pending: AnalysisSource | null = null;

  giveConsent(anonymousUse: boolean): void {
    this.consentGiven.set(true);
    this.anonymousUseAllowed.set(anonymousUse);
  }

  queue(source: AnalysisSource | null): void {
    this.pending = source;
  }

  take(): AnalysisSource | null {
    const source = this.pending;
    this.pending = null;
    return source;
  }
}
