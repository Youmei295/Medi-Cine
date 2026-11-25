#!/usr/bin/env bash
# Run sql/tests/*.sql. Each test file must exit 0 on PASS.
# Prints PASS/FAIL per file; exits non-zero if any fail.
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

pass=0
fail=0

echo "==> Checking table count (expect 21 public tables, excluding schema_migrations)"
table_count="$(psql_cmd -Atc "
  SELECT count(*)
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name <> 'schema_migrations';
" | tr -d '[:space:]')"

if [[ "$table_count" == "21" ]]; then
  echo "PASS  table_count=21"
  pass=$((pass + 1))
else
  echo "FAIL  table_count=${table_count} (expected 21)"
  fail=$((fail + 1))
fi

shopt -s nullglob
files=(sql/tests/*.sql)
if (( ${#files[@]} == 0 )); then
  echo "No test files found in sql/tests/"
  exit 1
fi

for file in "${files[@]}"; do
  name="$(basename "$file")"
  if output="$(psql_cmd -f - < "$file" 2>&1)"; then
    echo "PASS  $name"
    pass=$((pass + 1))
  else
    echo "FAIL  $name"
    echo "$output" | sed 's/^/       /'
    fail=$((fail + 1))
  fi
done

echo "==> Results: ${pass} passed, ${fail} failed"
if (( fail > 0 )); then
  exit 1
fi
exit 0
