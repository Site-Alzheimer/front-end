// Conferência rápida antes do upload: extensão e bytes mágicos do cabeçalho.
// É só conveniência para o usuário; a validação de verdade é no back.

export type SniffResult = { ok: true; compressed: boolean } | { ok: false; reason: string };

export async function sniffNifti(file: File): Promise<SniffResult> {
  if (!/\.nii(\.gz)?$/i.test(file.name)) {
    return { ok: false, reason: 'Envie um arquivo .nii ou .nii.gz.' };
  }
  const inicio = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  const compressed = inicio[0] === 0x1f && inicio[1] === 0x8b;
  // sem DecompressionStream não dá para olhar dentro do .gz: aceita e deixa o back validar
  if (compressed && typeof DecompressionStream === 'undefined') return { ok: true, compressed };
  let cabecalho: Uint8Array;
  try {
    cabecalho = compressed
      ? await descompactarInicio(file, 352)
      : new Uint8Array(await file.slice(0, 352).arrayBuffer());
  } catch {
    return { ok: false, reason: 'O arquivo .gz está corrompido.' };
  }
  if (cabecalho.length < 348)
    return { ok: false, reason: 'O arquivo é pequeno demais para ser um NIfTI.' };
  const dv = new DataView(cabecalho.buffer, cabecalho.byteOffset, cabecalho.byteLength);
  const tamanho = [dv.getInt32(0, true), dv.getInt32(0, false)];
  const texto = (inicio: number) => String.fromCharCode(...cabecalho.slice(inicio, inicio + 3));
  const nifti1 = tamanho.includes(348) && ['n+1', 'ni1'].includes(texto(344));
  const nifti2 = tamanho.includes(540) && ['n+2', 'ni2'].includes(texto(4));
  if (!nifti1 && !nifti2) return { ok: false, reason: 'O conteúdo do arquivo não é NIfTI.' };
  return { ok: true, compressed };
}

async function descompactarInicio(file: File, bytes: number): Promise<Uint8Array> {
  const leitor = file.stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  while (total < bytes) {
    const { value, done } = await leitor.read();
    if (done) break;
    partes.push(value);
    total += value.length;
  }
  await leitor.cancel();
  const saida = new Uint8Array(total);
  let o = 0;
  for (const p of partes) {
    saida.set(p, o);
    o += p.length;
  }
  return saida;
}
