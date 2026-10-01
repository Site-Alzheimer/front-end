// Produção: front e API no mesmo domínio (https://neuroia.ifce.edu.br); o nginx da VM
// repassa /v1, /healthz e /ws para a API. URL vazia = mesmo endereço do site.
export const environment = {
  apiUrl: '',
  /** Compacta .nii com gzip no navegador antes do envio (vale a pena em rede lenta). */
  compressUploads: true,
  // Na VM do IFCE cada exame leva ~40 s (CPU sem AVX); a folga cobre envio lento e outra análise na frente
  requestTimeoutMs: 300_000,
};
