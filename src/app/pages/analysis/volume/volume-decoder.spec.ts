import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { coronalMeans, decodeVolume, readRawVolume } from './volume-decoder';

// Autoteste com os exames reais, se estiverem na máquina (ficam fora do repositório):
// a média de cada fatia coronal canônica precisa bater com a do numpy/nibabel no back.
const raiz = resolve(process.cwd(), '..');
const exames = ['AD_002_S_0619', 'CN_002_S_0295'].filter(
  (e) =>
    existsSync(`${raiz}/arquivos-teste/${e}.nii`) &&
    existsSync(`${raiz}/referencia/intensidade_fatias_${e}.json`),
);

describe.skipIf(exames.length === 0)('leitura do volume contra o nibabel', () => {
  for (const exame of exames) {
    it(`${exame}: orientação, dimensões e média por fatia coronal`, async () => {
      const arquivo = readFileSync(`${raiz}/arquivos-teste/${exame}.nii`);
      const buffer = arquivo.buffer.slice(
        arquivo.byteOffset,
        arquivo.byteOffset + arquivo.byteLength,
      ) as ArrayBuffer;
      const ref = JSON.parse(
        readFileSync(`${raiz}/referencia/intensidade_fatias_${exame}.json`, 'utf8'),
      );

      const raw = await readRawVolume(buffer.slice(0));
      expect(raw.orientation).toBe(ref.eixos_original);
      expect(raw.layout.dims).toEqual(ref.forma_canonica);
      const medias = coronalMeans(raw);
      const esperado: number[] = ref.media_por_fatia_coronal;
      const piorErro = Math.max(
        ...medias.map((m, j) => Math.abs(m - esperado[j]) / Math.max(1, Math.abs(esperado[j]))),
      );
      expect(piorErro).toBeLessThan(1e-3);

      const vol = await decodeVolume(buffer.slice(0));
      expect(vol.voxels.length).toBe(ref.forma_canonica.reduce((a: number, b: number) => a * b, 1));
      expect(vol.window[1]).toBeGreaterThan(vol.window[0]);
    }, 60_000);
  }
});
