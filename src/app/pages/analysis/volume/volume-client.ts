import { DecodedVolume } from './volume-decoder';

export interface VolumeJob {
  promise: Promise<DecodedVolume>;
  cancel(): void;
}

/** Decodifica o NIfTI num Web Worker; o worker é encerrado ao terminar ou ao cancelar. */
export function loadVolume(file: Blob): VolumeJob {
  const worker = new Worker(new URL('./volume.worker', import.meta.url), { type: 'module' });
  let rejeitar: (e: Error) => void = () => {};
  const promise = new Promise<DecodedVolume>((resolve, reject) => {
    rejeitar = reject;
    worker.onmessage = ({ data }) => {
      worker.terminate();
      if (data.ok) resolve(data.volume as DecodedVolume);
      else reject(new Error(data.message));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || 'Falha ao ler o volume.'));
    };
    worker.postMessage(file);
  });
  return {
    promise,
    cancel: () => {
      worker.terminate();
      rejeitar(new DOMException('cancelado', 'AbortError'));
    },
  };
}
