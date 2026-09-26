/// <reference lib="webworker" />
// Lê o NIfTI fora do thread principal e devolve o volume canônico por transferência (sem cópia).
import { decodeVolume } from './volume-decoder';

addEventListener('message', async ({ data }: MessageEvent<Blob>) => {
  try {
    const volume = await decodeVolume(await data.arrayBuffer());
    postMessage({ ok: true, volume }, [volume.voxels.buffer]);
  } catch (erro) {
    postMessage({ ok: false, message: erro instanceof Error ? erro.message : String(erro) });
  }
});
