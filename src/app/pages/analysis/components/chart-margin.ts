/** Margens horizontais do gráfico da CNN1; o localizador sagital usa as mesmas para alinhar o eixo. */
export const ROI_MARGIN = { left: 40, right: 14 };

/** Posição CSS do centro da fatia j num eixo com n fatias, dentro das margens do gráfico. */
export function sliceLeft(j: number, n: number): string {
  const f = (j + 0.5) / n;
  return `calc(${ROI_MARGIN.left}px + (100% - ${ROI_MARGIN.left + ROI_MARGIN.right}px) * ${f})`;
}

export function sliceWidth(count: number, n: number): string {
  return `calc((100% - ${ROI_MARGIN.left + ROI_MARGIN.right}px) * ${count / n})`;
}
