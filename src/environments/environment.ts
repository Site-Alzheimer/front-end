// Produção: a API fica em outro endereço. Ajuste apiUrl ao publicar o front.
export const environment = {
  apiUrl: 'http://localhost:8000',
  /** Compacta .nii com gzip no navegador antes do envio (vale a pena em rede lenta). */
  compressUploads: true,
  requestTimeoutMs: 180_000,
};
