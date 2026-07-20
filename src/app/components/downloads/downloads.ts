import { Component } from '@angular/core';

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
  ];
}