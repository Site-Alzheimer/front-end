# Imagem do front para a VM do IFCE: compila o Angular e serve só os arquivos estáticos.
# O nginx da VM cuida do HTTPS e repassa para este container tudo o que não é da API.

# Etapa 1: build (o Node fica só nesta etapa, fora da imagem final)
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx ng build

# Etapa 2: nginx sem root, porta 8080
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/front-end/browser /usr/share/nginx/html
EXPOSE 8080
