import { neurologicalTransform, toView } from './analysis-view';
import { PredictionResponse } from './analysis.models';

describe('neurologicalTransform', () => {
  it('leva cada orientação de imagem do back à convenção neurológica', () => {
    expect(neurologicalTransform({ linhas: 'I', colunas: 'R' })).toBe('none');
    expect(neurologicalTransform({ linhas: 'I', colunas: 'L' })).toBe('scaleX(-1)');
    expect(neurologicalTransform({ linhas: 'R', colunas: 'S' })).toBe('rotate(-90deg)'); // entrada da CNN2
    expect(neurologicalTransform({ linhas: 'L', colunas: 'I' })).toBe('rotate(90deg)'); // entrada da CNN1
    expect(neurologicalTransform({ linhas: 'S', colunas: 'R' })).toBe('scaleY(-1)');
  });
});

function resposta(extra: Partial<PredictionResponse> = {}): PredictionResponse {
  const scores = Array.from({ length: 10 }, (_, i) => i);
  return {
    status: 'success',
    diagnostico: 'NORMAL',
    probabilidade_media: 0.2,
    estatisticas_predicao: {
      desvio_padrao: 0.1,
      coeficiente_variacao: 0.12,
      classificacao_cv: 'Acceptable precision',
      predicoes_19_slices: Array.from({ length: 19 }, (_, k) => (k === 0 ? 0.9 : 0.1)),
    },
    metadados_nifti: { dimensoes: [10, 10, 10], espacamento: [1, 1, 1] },
    metadados_varredura_cnn1: {
      roi_scores: scores,
      limite_inferior: 6,
      limite_superior: 8,
      slice_central: 7,
    },
    metadados_extracao_cnn2: { inicio_cranio_y: 12 },
    ...extra,
  };
}

describe('toView', () => {
  it('mantém os índices canônicos (P→A) e ordena as fatias anatomicamente', () => {
    const v = toView(resposta());
    expect(v.central).toBe(7);
    expect(v.window).toEqual([6, 8]);
    expect(v.slices[0].offset).toBeLessThanOrEqual(v.slices[18].offset);
    // offset +9 da API (k = 0) fica na borda anterior, limitado ao volume
    expect(v.slices.find((s) => s.k === 0)?.index).toBe(9);
    expect(v.votes).toBe(1);
  });
});
