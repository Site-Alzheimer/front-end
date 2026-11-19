// Contrato da API (back-end/main.py). Os campos opcionais só existem nas versões novas.

export type CvClass =
  'High precision' | 'Acceptable precision' | 'Moderate variability' | 'High variability';
export type Direction = 'L' | 'R' | 'P' | 'A' | 'I' | 'S';

export interface Crop {
  /** Eixo canônico (RAS) da faixa: x = esquerda→direita, z = inferior→superior. */
  eixo: 'x' | 'z';
  inicio: number;
  fim: number;
}

export interface ImageOrientation {
  linhas: Direction;
  colunas: Direction;
}

export interface PredictionResponse {
  status: 'success';
  diagnostico: 'ALZHEIMER' | 'NORMAL';
  probabilidade_media: number;
  estatisticas_predicao: {
    desvio_padrao: number;
    coeficiente_variacao: number;
    classificacao_cv: CvClass;
    /** Na ordem dos offsets (+9 … −9). */
    predicoes_19_slices: number[];
    votos_alzheimer?: number;
  };
  metadados_nifti: {
    dimensoes: number[];
    espacamento: number[];
    dimensoes_canonicas?: number[];
    espacamento_canonico?: number[];
    orientacao_original?: string;
    /** Orientação em que as redes recebem o volume. 'IPL': índices do notebook (0 = anterior). */
    orientacao_analise?: string;
    tipo_dado?: string;
  };
  metadados_varredura_cnn1: {
    /** Regressão sem limite (não é probabilidade), no índice da leitura usada (ver orientacao_analise). */
    roi_scores: number[];
    limite_inferior: number;
    limite_superior: number;
    slice_central: number;
    limiar?: number;
    score_max?: number;
    indice_max?: number;
    fallback?: boolean;
    recorte?: Crop;
  };
  metadados_extracao_cnn2: {
    inicio_cranio_y: number;
    offsets?: number[];
    indices?: number[];
    recorte?: Crop;
    margem?: number;
    int_max?: number;
  };
  tempos_ms?: {
    carga: number;
    cnn1: number;
    extracao: number;
    cnn2: number;
    visualizacao: number;
    gradcam?: number;
    total: number;
  };
  imagens?: {
    cnn2_sprite: string;
    grade: { colunas: number; linhas: number; tamanho: number };
    cnn1_central: string;
    orientacao_cnn2: ImageOrientation;
    orientacao_cnn1: ImageOrientation;
  };
  gradcam?: {
    camada: string;
    classe_alvo: number;
    h: number;
    w: number;
    mapas: number[][];
  };
}

/**
 * Etapas do stream de progresso. Com a fila de análises (RabbitMQ): `queued` enquanto o exame
 * espera, `start` quando o worker o pega e `result` quando o resultado está guardado.
 */
export type Stage =
  'ready' | 'queued' | 'start' | 'load' | 'cnn1' | 'extract' | 'cnn2' | 'done' | 'result';

/** Evento do stream SSE /v1/progress/{job_id}. */
export interface ProgressMessage {
  progress: number;
  status: string;
  stage?: Stage;
  done?: number;
  total?: number;
  /** Índice do primeiro score do lote. */
  start?: number;
  scores?: number[];
  /** `queued`: lugar na fila, contando os exames em análise (com um em análise, o próximo é o 2º). */
  posicao?: number;
  /** `result`: status HTTP que GET /v1/analises/{job_id} vai devolver. */
  http_status?: number;
}

/** GET /healthz. `fila` só existe quando a API usa a fila de análises. */
export interface HealthResponse {
  status: 'ok' | 'degraded';
  /** Com a fila: há worker conectado (ele só consome depois de carregar as CNNs). */
  models_loaded: boolean;
  fila?: { conectada: boolean; workers: number; aguardando: number };
}

/** Resposta 202 de POST /v1/analises e de GET /v1/analises/{job_id} enquanto o exame espera. */
export interface QueueTicket {
  job_id: string;
  estado: 'na_fila' | 'processando';
  posicao?: number;
  /** Caminho do resultado (GET). */
  resultado: string;
}

export type ErrorKind = 'format' | 'starting' | 'server' | 'network' | 'timeout';

export class AnalysisError extends Error {
  constructor(
    readonly kind: ErrorKind,
    message: string,
  ) {
    super(message);
  }
}
