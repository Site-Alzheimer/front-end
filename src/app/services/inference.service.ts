import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProgressData {
  progress: number;
  status: string;
}

export interface PredictionResult {
  diagnostico: string;
  probabilidade_media: number;
  estatisticas_predicao: {
    media?: number;
    desvio_padrao: number;
    coeficiente_variacao: number;
    consenso?: string;
    votos?: { [key: string]: number };
    classificacao_cv: string;
  };
  // Outros campos omitidos por brevidade
}

@Injectable({
  providedIn: 'root'
})
export class InferenceService {
  private http = inject(HttpClient);
  
  private apiUrl = 'http://localhost:8000';
  private wsUrl = 'ws://localhost:8000';

  public connectProgressWebSocket(jobId: string): Observable<ProgressData> {
    return new Observable(observer => {
      const ws = new WebSocket(`${this.wsUrl}/ws/progress/${jobId}`);
      
      ws.onmessage = (event) => {
        try {
          const data: ProgressData = JSON.parse(event.data);
          observer.next(data);
        } catch (e) {
          console.error("Error parsing websocket message", e);
        }
      };

      ws.onerror = (error) => {
        observer.error(error);
      };

      ws.onclose = () => {
        observer.complete();
      };

      return () => {
        ws.close();
      };
    });
  }

  public predict(file: File | Blob, jobId: string, filename: string): Observable<PredictionResult> {
    const formData = new FormData();
    formData.append('file', file, filename);
    return this.http.post<PredictionResult>(`${this.apiUrl}/v1/predict/alzheimer?job_id=${jobId}`, formData);
  }
}
