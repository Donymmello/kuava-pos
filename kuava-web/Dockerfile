# Imagem de PRODUÇÃO do kuava-web.
#
# O Vite embebe VITE_API_BASE_URL no bundle estático no momento do BUILD,
# não em runtime — por isso tem de vir como build ARG (docker-compose.prod.yml
# passa-o via `build.args`), nunca como `environment:` do contentor (isso só
# afetaria um servidor Node, e aqui o contentor final é só Nginx servindo
# ficheiros estáticos).
#
# Build: docker build -t kuava-web:latest --build-arg VITE_API_BASE_URL=/api -f Dockerfile .
# (a partir da pasta kuava-web/)

# ---- Stage 1: build dos ficheiros estáticos ----
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: servir os ficheiros estáticos via Nginx ----
FROM nginx:1.27-alpine AS runtime

# Configuração própria deste contentor (SPA: qualquer rota desconhecida cai
# em index.html) — diferente do Nginx de reverse-proxy do topo (ver
# deploy/nginx/nginx.conf), este só serve ficheiros estáticos na porta 80
# interna do contentor.
COPY nginx.spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:80/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
