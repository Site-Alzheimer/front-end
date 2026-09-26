// Orientação do volume, com as mesmas regras do nibabel usado no back
// (Nifti1Header.get_best_affine e orientations.io_orientation).

export type Mat3 = number[][];
/** Para cada eixo do voxel: [eixo do mundo (0 = x, 1 = y, 2 = z), sentido (+1 / −1)]. */
export type Ornt = [number, 1 | -1][];

export interface HeaderFields {
  littleEndian: boolean;
  qform_code: number;
  sform_code: number;
  pixDims: number[];
  /** Afim calculado pelo nifti-reader-js (usado só quando não há sform). */
  affine: number[][];
}

/**
 * Afim 3×3 na precedência do nibabel: sform (se sform_code > 0) > qform > afim base.
 * O nifti-reader-js prefere o qform quando sform_code < qform_code, por isso o srow
 * é lido direto dos bytes do cabeçalho.
 */
export function nibabelAffine(header: ArrayBuffer, h: HeaderFields, nifti2: boolean): Mat3 {
  const dv = new DataView(header);
  const le = h.littleEndian;
  if (h.sform_code > 0) {
    // NIfTI-1: srow_x/y/z em 280/296/312 (float32); NIfTI-2: 400/432/464 (float64)
    return [0, 1, 2].map((r) =>
      [0, 1, 2].map((c) =>
        nifti2 ? dv.getFloat64(400 + r * 32 + c * 8, le) : dv.getFloat32(280 + r * 16 + c * 4, le),
      ),
    );
  }
  if (h.qform_code > 0) return h.affine.slice(0, 3).map((row) => row.slice(0, 3));
  // afim base do nibabel: primeiro eixo invertido
  return [
    [-h.pixDims[1], 0, 0],
    [0, h.pixDims[2], 0],
    [0, 0, h.pixDims[3]],
  ];
}

/**
 * nib.orientations.io_orientation: percorre os eixos do voxel em ordem, escolhe o eixo do
 * mundo dominante da coluna e o retira das próximas escolhas. (O nibabel ortogonaliza a
 * matriz por SVD antes; para afins de RM, quase ortogonais, o resultado é o mesmo.)
 */
export function ioOrientation(M: Mat3): Ornt {
  const R = [0, 1, 2].map((r) => [0, 1, 2].map((c) => M[r][c]));
  for (let c = 0; c < 3; c++) {
    const norma = Math.hypot(R[0][c], R[1][c], R[2][c]) || 1;
    for (let r = 0; r < 3; r++) R[r][c] /= norma;
  }
  const ornt: Ornt = [];
  for (let c = 0; c < 3; c++) {
    let melhor = 0;
    for (let r = 1; r < 3; r++) if (Math.abs(R[r][c]) > Math.abs(R[melhor][c])) melhor = r;
    ornt.push([melhor, R[melhor][c] < 0 ? -1 : 1]);
    R[melhor] = [0, 0, 0];
  }
  return ornt;
}

const LETRAS = [
  ['L', 'R'],
  ['P', 'A'],
  ['I', 'S'],
];

/** Códigos de eixo como nib.aff2axcodes (ex.: "IPL"). */
export function axcodes(ornt: Ornt): string {
  return ornt.map(([w, s]) => LETRAS[w][s > 0 ? 1 : 0]).join('');
}

export interface CanonicalLayout {
  /** Dimensões em RAS: [nx (E→D), ny (P→A), nz (I→S)]. */
  dims: [number, number, number];
  spacing: [number, number, number];
  /** índice no array original = base + x·coef[0] + y·coef[1] + z·coef[2] */
  coef: [number, number, number];
  base: number;
}

/** Como ler o array original como se fosse nib.as_closest_canonical(img). */
export function canonicalLayout(dims: number[], zooms: number[], ornt: Ornt): CanonicalLayout {
  const passo = [1, dims[0], dims[0] * dims[1]];
  const dimC: [number, number, number] = [0, 0, 0];
  const espC: [number, number, number] = [0, 0, 0];
  const coef: [number, number, number] = [0, 0, 0];
  let base = 0;
  ornt.forEach(([w, s], eixo) => {
    dimC[w] = dims[eixo];
    espC[w] = zooms[eixo];
    if (s > 0) coef[w] = passo[eixo];
    else {
      coef[w] = -passo[eixo];
      base += passo[eixo] * (dims[eixo] - 1);
    }
  });
  return { dims: dimC, spacing: espC, coef, base };
}
