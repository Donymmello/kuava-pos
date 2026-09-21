#!/usr/bin/env bash
set -euo pipefail

# Restaura um backup do Postgres do Kuava POS a partir de um ficheiro criado
# por backup-postgres.sh.
#
# ATENÇÃO: isto SUBSTITUI os dados atuais da base de dados de produção — o
# dump é criado com --clean --if-exists, ou seja, apaga e recria todas as
# tabelas antes de repor os dados. Confirma sempre que estás a restaurar o
# ficheiro certo antes de continuar.
#
# Uso (a partir da raiz do repositório):
#   ./deploy/backup/restore-postgres.sh /var/backups/kuava-postgres/kuava_pos_20260825_030000.sql.gz

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

DUMP_FILE="${1:-}"
if [[ -z "$DUMP_FILE" || ! -f "$DUMP_FILE" ]]; then
  echo "Uso: $0 <caminho-para-o-ficheiro.sql.gz>" >&2
  exit 1
fi

ENV_FILE="${ENV_FILE:-.env.production}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Erro: $ENV_FILE não encontrado. Corre este script a partir da raiz do repositório." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"

echo "Vais restaurar '${DUMP_FILE}' para a base de dados '${DB_NAME}'."
echo "Isto APAGA e recria todas as tabelas atuais com o conteúdo do backup."
read -r -p "Escreve 'restaurar' para confirmar: " CONFIRM
if [[ "$CONFIRM" != "restaurar" ]]; then
  echo "Cancelado — nada foi alterado."
  exit 1
fi

echo "A restaurar..."
gunzip -c "$DUMP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T -e PGPASSWORD="$DB_PASSWORD" "$POSTGRES_SERVICE" \
  psql -U "$DB_USER" -d "$DB_NAME" --set ON_ERROR_STOP=on

echo "Restauro concluído."
echo "Recomendado: reiniciar a api para garantir que nenhuma ligação fica com estado antigo em cache:"
echo "  docker compose -f $COMPOSE_FILE restart api"
