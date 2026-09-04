# Deploy em produção — VPS partilhado com o vektra-site (Docker Compose + Caddy existente)

Este VPS já corre o `vektramz.com` (projeto `vektra-site`, em
`/opt/vektra-site`), atrás de um Caddy que é o único processo a ocupar as
portas 80/443 — ver `/opt/vektra-site/DEPLOY.md`. A Kuava POS **não traz o
seu próprio Nginx nem gere certificados**: junta-se a esse mesmo Caddy
através de uma rede Docker externa chamada `web`, que o `vektra-site` já
deixou preparada exactamente para isto. `docker-compose.prod.yml` já vem
configurado para essa rede — só falta adicionar um bloco ao `Caddyfile` do
outro projeto (passo 4 abaixo).

(Os ficheiros `deploy/nginx/*.example` e as referências a `certbot` que
ainda encontrares no repositório são de um plano anterior, com Nginx
próprio — ficaram obsoletos assim que percebemos que já havia um Caddy no
VPS. Podes remover esses ficheiros quando quiseres; não são usados nesta
versão.)

## 1. Preparar os segredos

Na raiz do repositório, no VPS:

```bash
cp .env.production.example .env.production
```

Edita `.env.production` e preenche a sério:
- `DB_PASSWORD` — gera com `openssl rand -base64 24`
- `JWT_SECRET` — gera com `openssl rand -hex 32`
- `CORS_ORIGIN` e `DOMAIN` já vêm certos (`https://kuava.vektramz.com` e
  `kuava.vektramz.com`)

Este ficheiro nunca é commitado (está no `.gitignore`).

## 2. Arrancar a stack

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build postgres api web
```

Não há fase "sem TLS" separada — como não há Nginx nem certificado geridos
aqui, não há nada que recuse arrancar por falta de certificado.

## 3. Aplicar migrações e criar o superadmin

```bash
docker compose -f docker-compose.prod.yml exec api npm run migrate
docker compose -f docker-compose.prod.yml exec api npm run seed:superadmin:prod
```

## 4. Juntar-se ao Caddy do vektra-site

Confirma primeiro que a rede partilhada existe (foi criada quando o
`vektra-site` foi publicado):

```bash
docker network ls | grep web
```

Os serviços `api` e `web` desta stack já se juntam a ela sozinhos (é o que
o `networks: [default, web]` no `docker-compose.prod.yml` faz) — falta só
dizer ao Caddy para onde encaminhar `kuava.vektramz.com`. Edita o
`Caddyfile` do outro projeto:

```bash
sudo nano /opt/vektra-site/Caddyfile
```

E acrescenta este bloco no fim do ficheiro (fora dos blocos já existentes
do `vektramz.com`):

```caddyfile
kuava.vektramz.com {
        handle /api/* {
                reverse_proxy kuava-api-prod:3333
        }
        handle /health {
                reverse_proxy kuava-api-prod:3333
        }
        handle {
                reverse_proxy kuava-web-prod:80
        }
        encode gzip
        header {
                Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        }
}
```

Importante: `handle` (não `handle_path`) para `/api/*` e `/health` — a API
espera receber o caminho completo com o prefixo `/api` (`app.use('/api',
routes)`), e o `/health` tem de ir para a `api`, não para o `web`, senão o
monitor da secção 8 nunca deteta a API em baixo (o `web` devolve sempre a
página da SPA com 200, mesmo sem saber se a API está viva).

Depois, reinicia só o Caddy (na pasta do outro projeto):

```bash
cd /opt/vektra-site
docker compose restart caddy
docker compose logs -f caddy   # confirma que emitiu o certificado para kuava.vektramz.com
```

Confirma `https://kuava.vektramz.com` — deve responder com cadeado válido
(o Caddy trata da renovação automática dele mesmo, tal como já faz para o
`vektramz.com` — nada a configurar aqui).

## 5. Logs

A API escreve logs estruturados (JSON, um por linha) em stdout — inclui um
log por pedido HTTP (método, rota, status, duração) e qualquer erro não
tratado, nunca o header `Authorization` nem cookies. Para consultar:

```bash
docker compose -f docker-compose.prod.yml logs api --tail=100 -f
```

Se mais tarde quiseres agregar/pesquisar estes logs fora do VPS (ex.
Grafana Loki, Better Stack, Axiom), já estão prontos para isso — é só
apontar um coletor de logs para a saída do contentor `api`, nada a mudar no
código.

## 6. Monitorização externa do /health

`GET /health` responde `200` quando a API está de pé — mas nada avisa se o
VPS cair, o contentor rebentar, ou o certificado expirar, a menos que
configures um monitor externo. Opção simples e gratuita:

1. Cria conta em [UptimeRobot](https://uptimerobot.com) (tem plano grátis).
2. Novo monitor → tipo "HTTP(s)" → URL `https://kuava.vektramz.com/health` →
   intervalo de verificação de 5 minutos.
3. Configura alerta por email (ou SMS/Telegram, conforme o plano) para
   quando o monitor ficar "down".

Isto avisa-te ativamente em vez de só descobrires que o site está em baixo
quando um cliente reclamar.

## Deploys seguintes (código novo)

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build api web
# se houver migrações novas:
docker compose -f docker-compose.prod.yml exec api npm run migrate
```

## 7. Backup do Postgres

O volume `kuava_postgres_prod_data` é a única cópia dos teus dados — sem
backup, um disco corrompido, um `docker volume rm` por engano, ou um VPS
comprometido apaga tudo de vez. `deploy/backup/backup-postgres.sh` automatiza
isto: corre `pg_dump` dentro do próprio contentor Postgres (não precisa de
nada instalado no VPS além do Docker que já usas), comprime, grava
localmente com rotação automática, e opcionalmente envia também uma cópia
para um bucket S3-compatível (AWS S3, Backblaze B2, etc.).

### 7.1 Configurar

No `.env.production` (ver `.env.production.example` para todas as
variáveis com comentários):

```bash
BACKUP_DIR=/var/backups/kuava-postgres
BACKUP_RETENTION_DAYS=14
```

Cria a pasta antes do primeiro backup:

```bash
sudo mkdir -p /var/backups/kuava-postgres
sudo chown $USER /var/backups/kuava-postgres
```

**Envio externo (recomendado)** — sem isto, um backup local não te protege
se o próprio VPS for perdido ou comprometido. Preenche também no
`.env.production`:

```bash
BACKUP_S3_BUCKET=o-teu-bucket
BACKUP_S3_ENDPOINT=          # só necessário fora da AWS, ex. Backblaze B2
BACKUP_S3_REGION=us-east-1
BACKUP_S3_ACCESS_KEY_ID=...
BACKUP_S3_SECRET_ACCESS_KEY=...
```

**Nota de segurança importante**: cria uma chave de acesso com permissão
**só de escrita** (`PutObject`), nunca de apagar (`DeleteObject`) — tanto a
AWS como o Backblaze B2 deixam criar chaves restritas a um único bucket e
sem permissão de eliminação. Assim, mesmo que alguém comprometa o VPS e
roube esta chave, não consegue apagar os backups já enviados, só criar
novos — o objetivo de um backup externo é sobreviver precisamente a esse
cenário. O script nunca tenta apagar nada remoto; se quiseres limitar
quanto espaço os backups antigos ocupam no bucket, configura uma regra de
"lifecycle" (expiração automática) diretamente no bucket, não com uma
chave que o VPS possa usar para apagar.

### 7.2 Agendar (cron diário)

```bash
crontab -e
```

Adiciona (backup todos os dias às 3h da manhã, hora do servidor):

```
0 3 * * * cd /caminho/para/o/repositorio && ./deploy/backup/backup-postgres.sh >> /var/log/kuava-backup.log 2>&1
```

Confirma que corre manualmente primeiro:

```bash
cd /caminho/para/o/repositorio
./deploy/backup/backup-postgres.sh
```

### 7.3 Restaurar

**Testa isto pelo menos uma vez, antes de precisares dele a sério** — um
backup que nunca foi restaurado não é garantidamente um backup que funciona.

```bash
./deploy/backup/restore-postgres.sh /var/backups/kuava-postgres/kuava_pos_20260825_030000.sql.gz
```

Pede confirmação explícita (escrever "restaurar") antes de tocar em nada —
o restauro apaga e recria todas as tabelas atuais com o conteúdo do
ficheiro. Depois de restaurar, reinicia a api para garantir que nenhuma
ligação fica com estado antigo em cache:

```bash
docker compose -f docker-compose.prod.yml restart api
```
