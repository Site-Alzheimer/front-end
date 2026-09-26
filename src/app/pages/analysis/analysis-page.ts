import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ConsentModal } from '../../components/consent-modal/consent-modal';
import { Icon } from '../../shared/icon/icon';
import { AnalysisHandoff, AnalysisSource } from '../../core/analysis-handoff';
import { AnalysisStore } from './analysis.store';
import { AnalysisDashboard } from './components/analysis-dashboard/analysis-dashboard';
import { ProcessingView } from './components/processing-view/processing-view';
import { UploadPanel } from './components/upload-panel/upload-panel';

const TITULOS: Record<string, string> = {
  format: 'O arquivo não pôde ser analisado',
  starting: 'O servidor ainda está iniciando',
  network: 'Sem conexão com o servidor',
  timeout: 'O servidor demorou demais',
  server: 'Erro no processamento',
};

@Component({
  selector: 'app-analysis-page',
  imports: [ConsentModal, Icon, UploadPanel, ProcessingView, AnalysisDashboard],
  providers: [AnalysisStore],
  templateUrl: './analysis-page.html',
  styleUrl: './analysis-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisPage {
  protected readonly store = inject(AnalysisStore);
  private readonly handoff = inject(AnalysisHandoff);
  protected readonly titles = TITULOS;
  /** Arquivo do usuário esperando o aceite do termo (as amostras não passam por aqui). */
  protected readonly awaitingConsent = signal<AnalysisSource | null>(null);

  constructor() {
    // amostra escolhida na home; "enviar o meu" chega sem exame e cai na tela de envio
    const pendente = this.handoff.take();
    if (pendente) this.request(pendente);
  }

  protected request(source: AnalysisSource): void {
    if (source.kind === 'file' && !this.handoff.consentGiven()) this.awaitingConsent.set(source);
    else void this.store.start(source);
  }

  protected acceptConsent(anonymousUse: boolean): void {
    this.handoff.giveConsent(anonymousUse);
    const source = this.awaitingConsent();
    this.awaitingConsent.set(null);
    if (source) void this.store.start(source);
  }

  // Recusou: o arquivo não é enviado e a tela de envio continua aberta
  protected declineConsent(): void {
    this.awaitingConsent.set(null);
  }
}
