import { Component, ElementRef, EventEmitter, Input, OnInit, Output, signal, viewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InferenceService, PredictionResult } from '../../services/inference.service';

type ModalState = 'UPLOAD' | 'PROCESSING' | 'RESULT';

@Component({
  selector: 'app-inference-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inference-modal.html',
  styleUrl: './inference-modal.css',
})
export class InferenceModal implements OnInit {
  @Input() initialFile: File | null = null;
  @Output() closed = new EventEmitter<void>();

  protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  protected readonly isDragging = signal(false);
  protected readonly fileName = signal<string | null>(null);
  
  protected readonly state = signal<ModalState>('UPLOAD');
  protected readonly progress = signal<number>(0);
  protected readonly statusMessage = signal<string>('Inicializando...');
  protected readonly result = signal<PredictionResult | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  private inferenceService = inject(InferenceService);

  // Getter for Accuracy Display
  protected get displayAccuracy(): number {
    const res = this.result();
    if (!res) return 0;
    const p = res.probabilidade_media;
    return p < 0.5 ? 1 - p : p;
  }

  // Getter for Confidence Bar Bottom Position based on classificacao_cv
  protected get confidenceIndicatorBottom(): string {
    const res = this.result();
    if (!res) return '0%';
    const cv = res.estatisticas_predicao?.classificacao_cv;
    switch (cv) {
      case 'High precision': return '87.5%';
      case 'Acceptable precision': return '62.5%';
      case 'Moderate variability': return '37.5%';
      case 'High variability': return '12.5%';
      default: return '50%';
    }
  }

  // Getter for Pie Chart Conic Gradient
  protected get pieGradient(): string {
    const res = this.result();
    if (!res) return '';
    const pAlz = res.probabilidade_media * 100;
    // Alzheimer (Orange) starts at 0, goes to pAlz.
    // Normal (Blue) starts at pAlz, goes to 100.
    return `conic-gradient(#df7020 0% ${pAlz}%, #1e6075 ${pAlz}% 100%)`;
  }

  // Helper for direct percentage rendering in the template
  protected get alzheimerPercent(): number {
    return (this.result()?.probabilidade_media || 0);
  }

  protected get normalPercent(): number {
    return 1 - (this.result()?.probabilidade_media || 0);
  }

  ngOnInit() {
    if (this.initialFile) {
      this.processFile(this.initialFile);
    }
  }

  protected close(): void {
    this.closed.emit();
  }

  protected openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }
 
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }
 
  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }
 
  protected onDragLeave(): void {
    this.isDragging.set(false);
  }
 
  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  private processFile(file: File): void {
    this.fileName.set(file.name);
    this.state.set('PROCESSING');
    this.progress.set(0);
    this.statusMessage.set('Processando Arquivos...');
    this.errorMessage.set(null);

    const jobId = Math.random().toString(36).substring(2, 15);

    // Conectar ao websocket
    const wsSubscription = this.inferenceService.connectProgressWebSocket(jobId).subscribe({
      next: (data) => {
        this.progress.set(data.progress);
        this.statusMessage.set(data.status);
      },
      error: (err) => {
        console.error('WebSocket error:', err);
      }
    });

    // Fazer a chamada HTTP
    this.inferenceService.predict(file, jobId, file.name).subscribe({
      next: (res) => {
        wsSubscription.unsubscribe();
        this.result.set(res);
        this.state.set('RESULT');
      },
      error: (err) => {
        wsSubscription.unsubscribe();
        console.error('HTTP error:', err);
        // Exibe o erro na UI
        this.errorMessage.set(err.error?.detail || 'Erro ao processar o arquivo. Verifique se o formato é .nii ou .nii.gz');
        this.state.set('RESULT'); // Exibe estado de resultado, mas com erro
      }
    });
  }

  protected reset(): void {
    this.state.set('UPLOAD');
    this.result.set(null);
    this.errorMessage.set(null);
    this.progress.set(0);
    this.fileName.set(null);
  }
}
