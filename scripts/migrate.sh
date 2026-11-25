#!/usr/bin/env bash
# Apply sql/migrations/*.sql in lexical order. Each file runs in one transaction.
# Already-applied versions (schema_migrations) are skipped.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-medi_cine}"
POSTGRES_DB="${POSTGRES_DB:-medi_cine}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

psql_cmd() {
  if docker compose ps --status running --services 2>/dev/null | grep -qx postgres; then
    docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
  else
    PGPASSWORD="${POSTGRES_PASSWORD:-}" psql -v ON_ERROR_STOP=1 \
      -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
  fi
}

echo "==> Ensuring schema_migrations exists"
psql_cmd <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
SQL

shopt -s nullglob
files=(sql/migrations/*.sql)
if (( ${#files[@]} == 0 )); then
  echo "No migration files found in sql/migrations/"
  exit 1
fi

for file in "${files[@]}"; do
  version="$(basename "$file")"
  already="$(psql_cmd -Atc "SELECT 1 FROM schema_migrations WHERE version = '${version}'" | tr -d '[:space:]')"
  if [[ "$already" == "1" ]]; then
    echo "SKIP  $version (already applied)"
    continue
  fi

  echo "APPLY $version"
  {
    echo "BEGIN;"
    cat "$file"
    echo
    echo "INSERT INTO schema_migrations (version) VALUES ('${version}');"
    echo "COMMIT;"
  } | psql_cmd
done

echo "==> Migrations complete"
