import { Crop, CvClass, Direction, ImageOrientation, PredictionResponse } from './analysis.models';

const OFFSETS = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6, -7, -8, -9];

export interface SliceEntry {
  /** Posição no lote (mesma ordem das predições e do sprite). */
  k: number;
  /** Índice coronal canônico (0 = posterior). */
  index: number;
  /** Deslocamento anatômico em relação à central (+ = anterior), como na Fig. 5.15 da tese. */
  offset: number;
  p: number;
}

export interface AnalysisView {
  diagnosis: 'ALZHEIMER' | 'NORMAL';
  mean: number;
  sd: number;
  cv: number;
  cvClass: CvClass;
  votes: number;
  meanDecision: 'ALZHEIMER' | 'NORMAL';
  /** Nº de fatias coronais; todos os índices abaixo estão no espaço canônico. */
  n: number;
  scores: number[];
  window: [number, number];
  central: number;
  threshold: number;
  scoreMax: number;
  indexMax: number;
  aboveThreshold: number;
  fallback: boolean;
  /** Ordem anatômica (−9 … +9). */
  slices: SliceEntry[];
  crops: { cnn1?: Crop; cnn2?: Crop };
  images?: {
    sprite: string;
    columns: number;
    rows: number;
    cnn1: string;
    /** transform CSS que leva cada imagem à convenção neurológica (S em cima, E à esquerda). */
    cnn2Transform: string;
    cnn1Transform: string;
  };
  meta: {
    dims: number[];
    spacing: number[];
    orientation?: string;
  };
  /** Grad-CAM da CNN2: um mapa h×w por posição do lote (mesma ordem do sprite), 0–1. */
  gradcam?: { layer: string; h: number; w: number; maps: number[][]; targetIsAd: boolean };
}

const OPOSTO: Record<Direction, Direction> = { L: 'R', R: 'L', P: 'A', A: 'P', I: 'S', S: 'I' };

// As 8 simetrias do quadrado em CSS e para onde vão as linhas/colunas da imagem de origem.
const TRANSFORMS: { css: string; rows: ['r' | 'c', 1 | -1]; cols: ['r' | 'c', 1 | -1] }[] = [
  { css: 'none', rows: ['r', 1], cols: ['c', 1] },
  { css: 'scaleX(-1)', rows: ['r', 1], cols: ['c', -1] },
  { css: 'scaleY(-1)', rows: ['r', -1], cols: ['c', 1] },
  { css: 'rotate(180deg)', rows: ['r', -1], cols: ['c', -1] },
  { css: 'rotate(90deg)', rows: ['c', 1], cols: ['r', -1] },
  { css: 'rotate(-90deg)', rows: ['c', -1], cols: ['r', 1] },
  { css: 'rotate(-90deg) scaleX(-1)', rows: ['c', 1], cols: ['r', 1] },
  { css: 'rotate(90deg) scaleX(-1)', rows: ['c', -1], cols: ['r', -1] },
];

/** Transformação CSS que deixa a imagem com linhas → inferior e colunas → direita do paciente. */
export function neurologicalTransform(o: ImageOrientation): string {
  const dir = ([axis, sign]: ['r' | 'c', 1 | -1]) => {
    const d = axis === 'r' ? o.linhas : o.colunas;
    return sign === 1 ? d : OPOSTO[d];
  };
  return TRANSFORMS.find((t) => dir(t.rows) === 'I' && dir(t.cols) === 'R')?.css ?? 'none';
}

export function toView(r: PredictionResponse): AnalysisView {
  const cnn1 = r.metadados_varredura_cnn1;
  const cnn2 = r.metadados_extracao_cnn2;
  const stats = r.estatisticas_predicao;
  const n = cnn1.roi_scores.length;

  const scores = cnn1.roi_scores;
  const scoreMax = cnn1.score_max ?? Math.max(...cnn1.roi_scores);
  const threshold = cnn1.limiar ?? 0.8 * scoreMax;
  const central = cnn1.slice_central;
  const offsets = cnn2.offsets ?? OFFSETS;
  const rawIndices =
    cnn2.indices ?? offsets.map((o) => Math.max(0, Math.min(n - 1, cnn1.slice_central + o)));
  const preds = stats.predicoes_19_slices;

  const slices = rawIndices
    .map((j, k) => ({ k, index: j, offset: j - central, p: preds[k] }))
    .sort((a, b) => a.offset - b.offset || a.k - b.k);

  const mean = preds.reduce((s, p) => s + p, 0) / preds.length;
  const votes = stats.votos_alzheimer ?? preds.filter((p) => p > 0.5).length;
  const window: [number, number] = [cnn1.limite_inferior, cnn1.limite_superior];
  const img = r.imagens;

  return {
    diagnosis: r.diagnostico,
    mean,
    sd: stats.desvio_padrao,
    cv: stats.coeficiente_variacao,
    cvClass: stats.classificacao_cv,
    votes,
    meanDecision: mean > 0.5 ? 'ALZHEIMER' : 'NORMAL',
    n,
    scores,
    window,
    central,
    threshold,
    scoreMax,
    indexMax: cnn1.indice_max ?? cnn1.roi_scores.indexOf(scoreMax),
    aboveThreshold: cnn1.roi_scores.filter((s) => s >= threshold).length,
    fallback: cnn1.fallback ?? false,
    slices,
    crops: { cnn1: cnn1.recorte, cnn2: cnn2.recorte },
    images: img && {
      sprite: img.cnn2_sprite,
      columns: img.grade.colunas,
      rows: img.grade.linhas,
      cnn1: img.cnn1_central,
      cnn2Transform: neurologicalTransform(img.orientacao_cnn2),
      cnn1Transform: neurologicalTransform(img.orientacao_cnn1),
    },
    meta: {
      dims: r.metadados_nifti.dimensoes,
      spacing: r.metadados_nifti.espacamento,
      orientation: r.metadados_nifti.orientacao_original,
    },
    gradcam: r.gradcam && {
      layer: r.gradcam.camada,
      h: r.gradcam.h,
      w: r.gradcam.w,
      maps: r.gradcam.mapas,
      targetIsAd: r.gradcam.classe_alvo === 0, // coluna 0 = Alzheimer
    },
  };
}
