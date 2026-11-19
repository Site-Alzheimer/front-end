// Deploy temporário (nov/2026, servidor do IFCE fora do ar): front na Netlify e API num Space do
// Hugging Face, em outro domínio. Build: npx ng build --configuration production,netlify
export const environment = {
  apiUrl: 'https://SEU-USUARIO-neuroia-api.hf.space',
  compressUploads: true,
  // O Space dorme sem uso; a primeira análise depois disso espera ele acordar e carregar os modelos
  requestTimeoutMs: 300_000,
};
