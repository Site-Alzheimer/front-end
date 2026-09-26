// Leitura do NIfTI no navegador (roda dentro do Web Worker).
// Resultado: volume canônico (RAS) em Uint8, com as fatias coronais contíguas, para desenhar
// qualquer fatia com um único putImageData. O array original (43 MB em float32) é descartado.
import * as nifti from 'nifti-reader-js';
import {
  axcodes,
  canonicalLayout,
  CanonicalLayout,
  ioOrientation,
  nibabelAffine,
} from './orientation';

export interface RawVolume {
  data: ArrayLike<number>;
  dims: [number, number, number];
  zooms: [number, number, number];
  slope: number;
  inter: number;
  layout: CanonicalLayout;
  orientation: string;
}

export interface DecodedVolume {
  /** Dimensões em RAS: [nx (E→D), ny (P→A), nz (I→S)]. */
  dims: [number, number, number];
  spacing: [number, number, number];
  /** Orientação do arquivo, como nib.aff2axcodes. */
  orientation: string;
  /** voxels[x + nx·(z + nz·y)]: a fatia coronal y é um bloco contíguo de nx·nz bytes. */
  voxels: Uint8Array;
  /** Janela usada na quantização (percentis 2 e 98 dos voxels não nulos). */
  window: [number, number];
}

type TypedCtor = new (buffer: ArrayBuffer, offset: number, length: number) => ArrayLike<number>;
const TIPOS: Record<number, TypedCtor> = {
  2: Uint8Array,
  256: Int8Array,
  4: Int16Array,
  512: Uint16Array,
  8: Int32Array,
  768: Uint32Array,
  16: Float32Array,
  64: Float64Array,
};

/** Lê cabeçalho e voxels, sem reorientar. Levanta Error com mensagem em português. */
export async function readRawVolume(input: ArrayBuffer): Promise<RawVolume> {
  let buf = input;
  if (nifti.isCompressed(buf)) buf = (await nifti.decompressAsync(buf)) as ArrayBuffer;
  if (!nifti.isNIFTI(buf)) throw new Error('O arquivo não é um NIfTI.');
  const h = nifti.readHeader(buf);
  const [ndim, n0, n1, n2] = h.dims;
  if (ndim < 3 || !n0 || !n1 || !n2) throw new Error('O volume precisa ser 3D.');
  const Tipo = TIPOS[h.datatypeCode];
  if (!Tipo) throw new Error(`Tipo de voxel ${h.datatypeCode} não suportado na pré-visualização.`);

  const n = n0 * n1 * n2; // num volume 4D, só o primeiro
  const bytes = h.numBitsPerVoxel / 8;
  const imagem = nifti.readImage(h, buf).slice(0, n * bytes);
  if (!h.littleEndian && bytes > 1) trocarBytes(new Uint8Array(imagem), bytes);
  const nifti2 = nifti.isNIFTI2(buf);
  const ornt = ioOrientation(nibabelAffine(buf, h, nifti2));
  const zooms: [number, number, number] = [h.pixDims[1], h.pixDims[2], h.pixDims[3]];
  const dims: [number, number, number] = [n0, n1, n2];
  return {
    data: new Tipo(imagem, 0, n),
    dims,
    zooms,
    // scl_slope = 0 significa "sem escala" na especificação
    slope: h.scl_slope && Number.isFinite(h.scl_slope) ? h.scl_slope : 1,
    inter: Number.isFinite(h.scl_inter) ? h.scl_inter : 0,
    layout: canonicalLayout(dims, zooms, ornt),
    orientation: axcodes(ornt),
  };
}

export async function decodeVolume(input: ArrayBuffer): Promise<DecodedVolume> {
  const raw = await readRawVolume(input);
  const { data, slope, inter } = raw;
  const { dims, coef, base, spacing } = raw.layout;
  const [nx, ny, nz] = dims;
  const [p2, p98] = percentisNaoNulos(data, slope, inter);
  const escala = 255 / (p98 - p2 || 1);

  const voxels = new Uint8Array(nx * ny * nz);
  let o = 0;
  for (let y = 0; y < ny; y++) {
    for (let z = 0; z < nz; z++) {
      let i = base + y * coef[1] + z * coef[2];
      for (let x = 0; x < nx; x++, i += coef[0]) {
        const g = (data[i] * slope + inter - p2) * escala;
        voxels[o++] = g <= 0 ? 0 : g >= 255 ? 255 : g;
      }
    }
  }
  return { dims, spacing, orientation: raw.orientation, voxels, window: [p2, p98] };
}

/** Média de cada fatia coronal canônica em valores reais (autoteste contra o numpy). */
export function coronalMeans(raw: RawVolume): number[] {
  const { dims, coef, base } = raw.layout;
  const [nx, ny, nz] = dims;
  const medias: number[] = [];
  for (let y = 0; y < ny; y++) {
    let soma = 0;
    for (let z = 0; z < nz; z++) {
      let i = base + y * coef[1] + z * coef[2];
      for (let x = 0; x < nx; x++, i += coef[0]) soma += raw.data[i] * raw.slope + raw.inter;
    }
    medias.push(soma / (nx * nz));
  }
  return medias;
}

function trocarBytes(b: Uint8Array, tamanho: number): void {
  for (let i = 0; i < b.length; i += tamanho) {
    for (let a = i, z = i + tamanho - 1; a < z; a++, z--) {
      const t = b[a];
      b[a] = b[z];
      b[z] = t;
    }
  }
}

// Histograma de 4096 classes em vez de ordenar milhões de valores
function percentisNaoNulos(
  data: ArrayLike<number>,
  slope: number,
  inter: number,
): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i] * slope + inter;
    if (v > 0) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!Number.isFinite(min)) return [0, 1];
  const classes = 4096;
  const largura = (max - min) / classes || 1;
  const hist = new Uint32Array(classes);
  let total = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i] * slope + inter;
    if (v > 0) {
      hist[Math.min(classes - 1, Math.floor((v - min) / largura))]++;
      total++;
    }
  }
  const percentil = (p: number) => {
    const alvo = total * p;
    let acumulado = 0;
    for (let k = 0; k < classes; k++) {
      acumulado += hist[k];
      if (acumulado >= alvo) return min + (k + 0.5) * largura;
    }
    return max;
  };
  return [percentil(0.02), percentil(0.98)];
}
