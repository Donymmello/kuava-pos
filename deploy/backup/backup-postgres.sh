#!/usr/bin/env bash
set -euo pipefail

# Backup automático da base de dados de produção do Kuava POS.
#
# Corre a partir da raiz do repositório (é onde o docker-compose.prod.yml e
# o .env.production vivem):
#   ./deploy/backup/backup-postgres.sh
#
# Pensado para correr via cron, uma vez por dia — ver deploy/README.md,
# secção "Backup do Postgres", para o passo a passo completo (agendar o
# cron, configurar envio externo, testar o restauro).
#
# O que faz:
#   1. Corre pg_dump dentro do próprio contentor Postgres via
#      `docker compose exec` — não precisa de cliente Postgres instalado no
#      VPS, só Docker (que já é um requisito deste projeto).
#   2. Comprime e grava em BACKUP_DIR (por omissão fora do repositório, para
#      nunca acabar acidentalmente versionado em git).
#   3. Apaga backups LOCAIS com mais de BACKUP_RETENTION_DAYS dias.
#   4. Se BACKUP_S3_BUCKET estiver definida, envia também uma cópia para um
#      bucket S3-compatível (AWS S3, Backblaze B2, etc.) via um contentor
#      Docker descartável da AWS CLI — nunca instala nada no VPS para isto.
#      Este script NUNCA apaga nada no bucket remoto (só cria) — a rotação
#      do lado remoto, se quiseres, faz-se com uma regra de "lifecycle" no
#      próprio bucket, não com credenciais que o VPS possa usar para apagar
#      backups antigos. Ver a nota de segurança no README.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE não encontrado. Corre este script a partir da raiz do repositório, com o .env.production já preenchido." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

BACKUP_DIR="${BACKUP_DIR:-/var/backups/kuava-postgres}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"
DUMP_FILE="$BACKUP_DIR/kuava_pos_${TIMESTAMP}.sql.gz"
TMP_FILE="${DUMP_FILE}.tmp"

log() {
  echo "[$(date -u +%FT%TZ)] $*"
}

log "A criar backup de '${DB_NAME}' -> ${DUMP_FILE}"

docker compose -f "$COMPOSE_FILE" exec -T -e PGPASSWORD="$DB_PASSWORD" "$POSTGRES_SERVICE" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  | gzip > "$TMP_FILE"

# Só troca para o nome final depois do dump terminar por completo — assim a
# rotação/envio abaixo nunca apanham um ficheiro a meio (ex. se o cron for
# interrompido a meio do dump).
mv "$TMP_FILE" "$DUMP_FILE"

DUMP_SIZE="$(du -h "$DUMP_FILE" | cut -f1)"
log "Backup local concluído (${DUMP_SIZE})."

# --- Rotação local ---
if [[ "$BACKUP_RETENTION_DAYS" -gt 0 ]]; then
  DELETED="$(find "$BACKUP_DIR" -maxdepth 1 -name 'kuava_pos_*.sql.gz' -mtime "+${BACKUP_RETENTION_DAYS}" -print -delete)"
  if [[ -n "$DELETED" ]]; then
    log "Rotação: apagados backups locais com mais de ${BACKUP_RETENTION_DAYS} dias:"
    while IFS= read -r line; do echo "  $line"; done <<< "$DELETED"
  fi
fi

# --- Envio externo opcional (S3 / Backblaze B2 / qualquer S3-compatível) ---
if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
  if [[ -z "${BACKUP_S3_ACCESS_KEY_ID:-}" || -z "${BACKUP_S3_SECRET_ACCESS_KEY:-}" ]]; then
    log "[aviso] BACKUP_S3_BUCKET definida mas faltam BACKUP_S3_ACCESS_KEY_ID/BACKUP_S3_SECRET_ACCESS_KEY — a saltar o envio externo desta vez."
  else
    S3_TARGET="s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX:-kuava-postgres}/$(basename "$DUMP_FILE")"
    log "A enviar para ${S3_TARGET}..."

    ENDPOINT_ARGS=()
    if [[ -n "${BACKUP_S3_ENDPOINT:-}" ]]; then
      ENDPOINT_ARGS=(--endpoint-url "$BACKUP_S3_ENDPOINT")
    fi

    docker run --rm \
      -e AWS_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" \
      -e AWS_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" \
      -e AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-us-east-1}" \
      -v "$DUMP_FILE:/backup/$(basename "$DUMP_FILE"):ro" \
      amazon/aws-cli s3 cp "/backup/$(basename "$DUMP_FILE")" "$S3_TARGET" "${ENDPOINT_ARGS[@]}"

    log "Envio externo concluído."
  fi
else
  log "BACKUP_S3_BUCKET não definida — só backup local, sem envio externo (ver .env.production.example para ativar)."
fi

log "Backup concluído."
