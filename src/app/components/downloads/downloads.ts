import { Component, computed, signal } from '@angular/core';
import { InferenceModal } from '../inference-modal/inference-modal';

interface DownloadSample {
  fileName: string;
  imagePath: string;
  label: string;
  source: string;
  diagnosis: string;
}

@Component({
  selector: 'app-downloads',
  imports: [InferenceModal],
  templateUrl: './downloads.html',
  styleUrl: './downloads.css',
})
export class Downloads {
  protected readonly itemsPerPage = 4;

  protected readonly inferenceModalOpen = signal(false);
  protected readonly initialInferenceFile = signal<File | null>(null);

  protected readonly samples: DownloadSample[] = [
    {
      fileName: 'exemplo-1.png',
      imagePath: 'assets/images/image-ressonancia.png',
      label: 'Amostra saudável',
      source: 'ADNI',
      diagnosis: 'Diagnosticado clinicamente como Normal controlado',
    },
    {
      fileName: 'exemplo-2.png',
      imagePath: 'assets/images/image-ressonancia.png',
      label: 'Amostra saudável',
      source: 'ADNI',
      diagnosis: 'Diagnosticado clinicamente como Normal controlado',
    },
    {
      fileName: 'exemplo-3.png',
      imagePath: 'assets/images/image-ressonancia.png',
      label: 'Amostra saudável',
      source: 'ADNI',
      diagnosis: 'Diagnosticado clinicamente como Normal controlado',
    },
    {
      fileName: 'exemplo-4.png',
      imagePath: 'assets/images/image-ressonancia.png',
      label: 'Amostra saudável',
      source: 'ADNI',
      diagnosis: 'Diagnosticado clinicamente como Normal controlado',
    },
    {
      fileName: 'exemplo-5.png',
      imagePath: 'assets/images/image-ressonancia.png',
      label: 'Amostra saudável',
      source: 'ADNI',
      diagnosis: 'Diagnosticado clinicamente como Normal controlado',
    },
    {
      fileName: 'exemplo-6.png',
      imagePath: 'assets/images/image-ressonancia.png',
      label: 'Amostra saudável',
      source: 'ADNI',
      diagnosis: 'Diagnosticado clinicamente como Normal controlado',
    },
    {
      fileName: 'exemplo-7.png',
      imagePath: 'assets/images/image-ressonancia.png',
      label: 'Amostra saudável',
      source: 'ADNI',
      diagnosis: 'Diagnosticado clinicamente como Normal controlado',
    },
    {
      fileName: 'exemplo-8.png',
      imagePath: 'assets/images/image-ressonancia.png',
      label: 'Amostra saudável',
      source: 'ADNI',
      diagnosis: 'Diagnosticado clinicamente como Normal controlado',
    },
  ];

  // Divide as amostras em páginas de 4 em 4 para o carrossel
  protected readonly pages = computed<DownloadSample[][]>(() => {
    const chunks: DownloadSample[][] = [];
    for (let i = 0; i < this.samples.length; i += this.itemsPerPage) {
      chunks.push(this.samples.slice(i, i + this.itemsPerPage));
    }
    return chunks;
  });

  protected readonly currentPage = signal(0);

  protected readonly totalPages = computed(() => this.pages().length);

  protected next(): void {
    const total = this.totalPages();
    this.currentPage.set((this.currentPage() + 1) % total);
  }

  protected prev(): void {
    const total = this.totalPages();
    this.currentPage.set((this.currentPage() - 1 + total) % total);
  }

  protected goTo(index: number): void {
    this.currentPage.set(index);
  }

  protected openInferenceModal(file: File | null = null): void {
    this.initialInferenceFile.set(file);
    this.inferenceModalOpen.set(true);
  }

  protected closeInferenceModal(): void {
    this.inferenceModalOpen.set(false);
    this.initialInferenceFile.set(null);
  }

  protected async loadExampleImage(sample: DownloadSample): Promise<void> {
    try {
      const response = await fetch(sample.imagePath);
      const blob = await response.blob();
      const file = new File([blob], sample.fileName, { type: blob.type });
      this.openInferenceModal(file);
    } catch (e) {
      console.error('Failed to load example image', e);
      // Open modal anyway so user can upload manually if they want
      this.openInferenceModal(null);
    }
  }
}