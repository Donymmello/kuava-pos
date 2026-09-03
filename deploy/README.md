# Deploy em produção — VPS próprio (Docker Compose + Nginx)

Isto assume: um VPS Linux com Docker e Docker Compose instalados, uma
porta 80 e 443 livres, e um domínio (ex. `kuava.exemplo.co.mz`) cujo
registo DNS `A` já aponta para o IP do VPS.

## 1. Preparar os segredos

Na raiz do repositório, no VPS:

```bash
cp .env.production.example .env.production
```

Edita `.env.production` e preenche a sério:
- `DB_PASSWORD` — gera com `openssl rand -base64 24`
- `JWT_SECRET` — gera com `openssl rand -hex 32`
- `CORS_ORIGIN` e `DOMAIN` — o teu domínio real (com `https://` no
  `CORS_ORIGIN`, sem no `DOMAIN`)

Este ficheiro nunca é commitado (está no `.gitignore`).

## 2. Primeiro arranque — sem TLS ainda

O Nginx recusa arrancar se apontar para um certificado que não existe, por
isso o primeiro arranque é propositadamente sem HTTPS:

```bash
cp deploy/nginx/bootstrap.conf.example deploy/nginx/active.conf
# edita deploy/nginx/active.conf — já vem preenchido com kuava.vektramz.com

docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build postgres api web nginx
```

Confirma que o site responde em `http://kuava.vektramz.com` (ainda sem cadeado).

## 3. Aplicar migrações e criar o superadmin

```bash
docker compose -f docker-compose.prod.yml exec api npm run migrate
docker compose -f docker-compose.prod.yml exec api npm run seed:superadmin:prod
```

## 4. Pedir o certificado TLS (Let's Encrypt)

```bash
mkdir -p deploy/certbot/www deploy/certbot/conf

docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d kuava.vektramz.com \
  --email o-teu-email@exemplo.com --agree-tos --no-eff-email
```

Nota: só um `-d` porque `kuava.vektramz.com` é um subdomínio — não faz sentido pedir
também `www.kuava.vektramz.com` (isso seria um subdomínio diferente, sem DNS
apontado para o VPS).

Se correr bem, os certificados ficam em `deploy/certbot/conf/live/kuava.vektramz.com/`.

## 5. Ativar HTTPS

```bash
cp deploy/nginx/kuava.conf.example deploy/nginx/active.conf
# edita deploy/nginx/active.conf — já vem preenchido com kuava.vektramz.com

docker compose -f docker-compose.prod.yml restart nginx
```

Confirma `https://kuava.vektramz.com` — deve responder com cadeado válido, e
`http://kuava.vektramz.com` deve redirecionar automaticamente para https.

## 6. Renovação automática

O serviço `certbot` no `docker-compose.prod.yml` já corre em loop e tenta
renovar a cada 12h — o certbot só renova de facto quando faltam menos de 30
dias, por isso não há nada manual a fazer depois disto. Confirma de vez em
quando com:

```bash
docker compose -f docker-compose.prod.yml logs certbot --tail=50
```

## 7. Logs

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

## 8. Monitorização externa do /health

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

## 9. Backup do Postgres

O volume `kuava_postgres_prod_data` é a única cópia dos teus dados — sem
backup, um disco corrompido, um `docker volume rm` por engano, ou um VPS
comprometido apaga tudo de vez. `deploy/backup/backup-postgres.sh` automatiza
isto: corre `pg_dump` dentro do próprio contentor Postgres (não precisa de
nada instalado no VPS além do Docker que já usas), comprime, grava
localmente com rotação automática, e opcionalmente envia também uma cópia
para um bucket S3-compatível (AWS S3, Backblaze B2, etc.).

### 9.1 Configurar

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

### 9.2 Agendar (cron diário)

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

### 9.3 Restaurar

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
