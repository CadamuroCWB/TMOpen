#!/usr/bin/env bash
set -euo pipefail

# restore-remote.sh
# Uso na Hostinger:
#   1) Envie o arquivo .dump (gerado pelo backup-local.ps1) para a pasta
#      /opt/tmopen/data/postgres-backups/  (via scp/sftp)
#
#   2) Rode a partir de /opt/tmopen:
#        chmod +x ./scripts/restore-remote.sh
#        ./scripts/restore-remote.sh ./data/postgres-backups/tmopen-20260820-140000.dump
#
# Flags opcionais:
#   --no-drop       Nao DROP/CREATE o db; executa pg_restore com --clean (default: false)
#   --jobs N        Paralelismo do pg_restore (default: 4)
#   --compose FILE  Arquivo compose (default: docker-compose.prod.yml)

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

DUMP_FILE=""
DROP_FIRST=true
JOBS=4
COMPOSE_FILE="docker-compose.prod.yml"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-drop)     DROP_FIRST=false; shift ;;
        --jobs)        JOBS="$2"; shift 2 ;;
        --compose)     COMPOSE_FILE="$2"; shift 2 ;;
        -h|--help)
            cat <<EOF
Uso: $0 CAMINHO_PARA_TMOPEN_XXXX.dump [opcoes]

  --no-drop       Nao apaga o db antes; usa pg_restore --clean --if-exists
  --jobs N        Paralelismo de restore (default 4)
  --compose FILE  Arquivo compose (default docker-compose.prod.yml)
EOF
            exit 0 ;;
        *)
            if [[ -z "$DUMP_FILE" ]]; then
                DUMP_FILE="$1"
            else
                echo "ERRO: argumento inesperado '$1'" >&2
                exit 2
            fi
            shift ;;
    esac
done

if [[ -z "$DUMP_FILE" ]]; then
    echo "ERRO: informe o caminho do .dump como primeiro argumento." >&2
    exit 2
fi

if [[ ! -f "$DUMP_FILE" ]]; then
    echo "ERRO: .dump nao encontrado: $DUMP_FILE" >&2
    exit 2
fi

COMPOSE_CMD=(docker compose)
if [[ -n "$COMPOSE_FILE" ]]; then
    COMPOSE_CMD+=(-f "$COMPOSE_FILE")
fi

POSTGRES_USER="${POSTGRES_USER:-tmopen}"
POSTGRES_DB="${POSTGRES_DB:-tmopen}"

if [[ -f ".env" ]]; then
    set -a; . ./.env; set +a
    echo ".env carregado. POSTGRES_USER=$POSTGRES_USER POSTGRES_DB=$POSTGRES_DB"
fi

DUMP_BASENAME="$(basename "$DUMP_FILE")"
POSTGRES_BACKUPS_HOST="$(pwd)/data/postgres-backups"
mkdir -p "${POSTGRES_BACKUPS_HOST}"
DUMP_INSIDE_CONTAINER="/backups/${DUMP_BASENAME}"

if [[ ! -f "${POSTGRES_BACKUPS_HOST}/${DUMP_BASENAME}" ]]; then
    echo "==> Copiando $DUMP_FILE para ${POSTGRES_BACKUPS_HOST}/${DUMP_BASENAME}"
    cp -f "$DUMP_FILE" "${POSTGRES_BACKUPS_HOST}/${DUMP_BASENAME}"
fi

echo
echo "========================================="
echo " RESTAURACAO HOSTINGER - PRE-FLIGHT"
echo "========================================="
echo " Compose file    : $COMPOSE_FILE"
echo " Postgres user   : $POSTGRES_USER"
echo " Postgres db     : $POSTGRES_DB"
echo " Arquivo dump    : ${POSTGRES_BACKUPS_HOST}/${DUMP_BASENAME}"
echo " Drop antes?     : $DROP_FIRST"
echo " Jobs (parallel) : $JOBS"
echo

echo "==> 1/5: Parando container da API (trava liberada)..."
"${COMPOSE_CMD[@]}" stop api || true

echo
echo "==> 2/5: Confirmando postgres healthy"
"${COMPOSE_CMD[@]}" up -d postgres
sleep 2
SECS=0
while [[ $SECS -lt 90 ]]; do
    STATE=$("${COMPOSE_CMD[@]}" ps postgres --format json 2>/dev/null | jq -r '.State // "?"' 2>/dev/null || echo "?")
    HEALTHY=$("${COMPOSE_CMD[@]}" ps postgres --format json 2>/dev/null | jq -r '.Health // "?"' 2>/dev/null || echo "?")
    if [[ "$STATE" == "running" && ("$HEALTHY" == "healthy" || "$HEALTHY" == "?" ) ]]; then
        # tenta pg_isready para confirmar mesmo
        if "${COMPOSE_CMD[@]}" exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
            echo "    Postgres healthy apos ${SECS}s."
            break
        fi
    fi
    sleep 3
    SECS=$((SECS+3))
done
if [[ $SECS -ge 90 ]]; then
    echo "ERRO: postgres nao ficou healthy em 90s" >&2
    exit 1
fi

if [[ "$DROP_FIRST" == "true" ]]; then
    echo
    echo "==> 3/5: Drop + Create database $POSTGRES_DB"
    "${COMPOSE_CMD[@]}" exec -T postgres psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 <<SQL
-- kicka todas as conexões antigas
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS ${POSTGRES_DB};
CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};
SQL
else
    echo
    echo "==> 3/5: (--no-drop) Preservando db existente. pg_restore --clean sera usado"
fi

echo
echo "==> 4/5: pg_restore (jobs=$JOBS)"
RESTORE_ARGS=(--no-owner --no-privileges --verbose --jobs "$JOBS" --format custom)
if [[ "$DROP_FIRST" != "true" ]]; then
    RESTORE_ARGS+=(--clean --if-exists)
fi

if "${COMPOSE_CMD[@]}" exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" "${RESTORE_ARGS[@]}" "$DUMP_INSIDE_CONTAINER"
then
    echo "    pg_restore OK."
else
    RC=$?
    echo "WARNING: pg_restore retornou exit code $RC. Muitas vezes warnings de 'objeto ja existe' sao inofensivos."
    echo "Verifique abaixo na etapa COUNTS se bate com os valores do backup."
fi

echo
echo "==> 5/5: Reiniciando API"
"${COMPOSE_CMD[@]}" up -d --build --force-recreate --no-deps api
sleep 5
"${COMPOSE_CMD[@]}" ps

echo
echo "========================================="
echo " COUNTS FINAIS (por tabela)"
echo "========================================="
"${COMPOSE_CMD[@]}" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
WITH wanted(t) AS (VALUES
  ('cnaes'),('motivos'),('municipios'),('naturezas_juridicas'),('paises'),('qualificacoes_socios'),
  ('empresas'),('estabelecimentos'),('socios'),('dados_simples')
),
cnt(t, rows) AS (
  SELECT wanted.t::text,
         (xpath('/row/cnt/text()',
            query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I', wanted.t::regclass::text), false, true, '')
         ))[1]::text::bigint
  FROM wanted
)
SELECT t AS tabela, to_char(rows, '999G999G999G999') AS "linhas"
FROM cnt
ORDER BY t;
SQL

echo
echo "========================================="
echo " RESTAURACAO CONCLUIDA "
echo "========================================="
echo " - API reiniciada e migracoes reaplicadas automaticamente (entrypoint)"
echo " - Verifique o log da API com:  ${COMPOSE_CMD[*]} logs -f api"
echo " - Para validar a API:  curl -s http://127.0.0.1:3000/healthz"
echo
