# Imagem de PRODUÇÃO do kuava-api.
#
# Diferente do Dockerfile.dev: sem bind mount de código, sem hot-reload,
# corre o JS já compilado (dist/) com apenas as dependências de produção
# instaladas (sequelize-cli fica incluído de propósito — é preciso para
# correr `npm run migrate` / `npm run seed:superadmin:prod` neste mesmo
# contentor antes/depois do deploy, ver docker-compose.prod.yml).
#
# Build: docker build -t kuava-api:latest -f Dockerfile .
# (a partir da pasta kuava-api/)

# ---- Stage 1: dependências completas (dev incluído, precisa do tsc) ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: compilação TypeScript -> JavaScript ----
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

# ---- Stage 3: imagem final, só com o necessário para correr ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Só as dependências de produção — imagem final mais pequena e com menos
# superfície de ataque (sem typescript, vitest, tsx, etc).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Ficheiros de sequelize-cli (migrações/config) não fazem parte do output
# do tsc — são precisos tal como estão. seeders/ fica de fora de propósito:
# está vazia (nada usa `sequelize-cli db:seed`, o seed do superadmin é o
# script dist/scripts/seedSuperadmin.js, já incluído via dist/ acima) e uma
# pasta vazia nem sequer é reconhecida pelo git, por isso nunca chega a
# existir no checkout do VPS — copiá-la aqui rebentava sempre o build.
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/.sequelizerc ./.sequelizerc
COPY --from=build /app/src/config/sequelize-cli.config.js ./src/config/sequelize-cli.config.js

# Corre como utilizador sem privilégios — nunca root dentro do contentor.
RUN addgroup -S kuava && adduser -S kuava -G kuava
USER kuava

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3333/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
