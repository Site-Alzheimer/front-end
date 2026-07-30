import { Component, computed, signal } from '@angular/core';

interface DownloadSample {
  fileName: string;
  imagePath: string;
  label: string;
  source: string;
  diagnosis: string;
}

@Component({
  selector: 'app-downloads',
  imports: [],
  templateUrl: './downloads.html',
  styleUrl: './downloads.css',
})
export class Downloads {
  protected readonly itemsPerPage = 4;

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
}