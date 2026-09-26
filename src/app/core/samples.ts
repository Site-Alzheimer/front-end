import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiUrl } from './api';

/** Exame de exemplo servido pela API (GET /v1/amostras). */
export interface Sample {
  id: string;
  rotulo: string;
  fonte: string;
  diagnostico_clinico?: string;
  licenca?: string;
  arquivo: string;
  tamanho_bytes: number;
  tem_miniatura: boolean;
}

@Injectable({ providedIn: 'root' })
export class SamplesService {
  private readonly http = inject(HttpClient);

  list(): Observable<Sample[]> {
    return this.http.get<Sample[]>(apiUrl('/v1/amostras'));
  }

  thumbnailUrl(id: string): string {
    return apiUrl(`/v1/amostras/${encodeURIComponent(id)}/miniatura`);
  }

  fileUrl(id: string): string {
    return apiUrl(`/v1/amostras/${encodeURIComponent(id)}/arquivo`);
  }
}
