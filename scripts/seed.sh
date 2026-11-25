#!/usr/bin/env bash
# Run all sql/seed/*.sql (idempotent seeds).
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

psql_cmd() {
  docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" "$@"
}

shopt -s nullglob
files=(sql/seed/*.sql)
if (( ${#files[@]} == 0 )); then
  echo "No seed files found in sql/seed/"
  exit 1
fi

for file in "${files[@]}"; do
  echo "SEED  $(basename "$file")"
  psql_cmd -f - < "$file"
done

echo "==> Seed complete"
