/**
 * Desenho genérico de um cérebro (não é de nenhum exame), para quando a ressonância não está no
 * navegador: os exames de exemplo do ADNI ficam no servidor. O desenho acompanha a varredura real da
 * CNN1 (o cursor), mas a imagem em si é só ilustração.
 */

/** Corte coronal, viewBox 0 0 200 170: o lado esquerdo da imagem; o direito é o espelho (x = 100). */
export const CORONAL = {
  /** Preenchimento do hemisfério, fechado pela linha média. */
  hemisphere:
    'M100.6 24C86 14 58 14 42 26C26 38 18 58 19 80C20 96 25 108 32 116C26 124 26 138 36 146' +
    'C46 154 62 152 70 142C74 136 80 132 90 132L100.6 132Z',
  /** Contorno externo, sem a linha média: os dois lados se encontram sem emenda. */
  outline:
    'M100 24C86 14 58 14 42 26C26 38 18 58 19 80C20 96 25 108 32 116C26 124 26 138 36 146' +
    'C46 154 62 152 70 142C74 136 80 132 90 132',
  /** Sulcos, fissura lateral e o contorno do hipocampo. */
  details:
    'M33 116C46 110 60 108 74 112M40 40C48 46 46 56 38 60M62 22C64 32 72 36 70 46' +
    'M24 84C34 86 38 94 30 100M50 74C58 78 60 88 54 94M72 128C76 122 84 122 86 128',
  /** Corno do ventrículo lateral, que com o espelho forma o "V" do corte coronal. */
  ventricle: 'M99 62L87 55C84 58 84 64 88 67L99 73Z',
  /** Fissura entre os hemisférios (só em cima) e o corpo caloso. */
  midline: 'M100 24L100 54M76 60C88 52 112 52 124 60',
  stem: 'M90 132C92 144 94 156 95 166L105 166C106 156 108 144 110 132Z',
  stemEdge: 'M90 132C92 144 94 156 95 166L105 166C106 156 108 144 110 132',
};

/** Corte sagital, viewBox 0 0 256 100: x é a fatia coronal (0 = anterior, à esquerda), como no gráfico. */
export const SAGITTAL = {
  cerebrum:
    'M44 50C40 26 62 6 100 4C140 2 190 8 214 30C226 42 230 56 222 64C214 70 200 68 188 66' +
    'C176 64 166 70 156 74C146 82 120 84 104 76C96 72 92 66 84 66C70 66 54 66 48 62' +
    'C45 59 44 55 44 50Z',
  cerebellum: 'M176 70C186 64 210 66 220 72C224 82 210 90 194 88C182 86 174 80 176 70Z',
  stem: 'M150 76C154 84 156 92 156 100L168 100C168 92 168 84 174 74Z',
  details:
    'M132 4C136 16 128 26 134 40M86 64C104 54 132 52 156 58M200 16C196 28 200 40 194 52' +
    'M92 44C110 30 160 30 178 44M64 22C70 30 64 40 72 48M104 8C108 18 102 26 108 34' +
    'M182 76C194 72 208 74 216 78M184 82C196 78 206 80 212 84',
};

/**
 * Tamanho do corte coronal na fatia j de n: pequeno nas pontas (antes do lobo frontal e depois do
 * occipital), cheio no meio. Dá a impressão de atravessar o cérebro enquanto a CNN1 avança.
 */
export function coronalScale(j: number, n: number): number {
  const t = ((j + 0.5) / Math.max(1, n) - 0.15) / 0.73;
  if (t <= 0 || t >= 1) return 0.3;
  return 0.3 + 0.7 * Math.sqrt(Math.sin(Math.PI * t));
}
