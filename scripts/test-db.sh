#!/usr/bin/env bash
# Prueba las migraciones de supabase/migrations y las reglas de seguridad (RLS)
# en un Postgres temporal. Necesita Postgres 15+ instalado (initdb, pg_ctl, psql).
# Uso: npm run test:db
set -euo pipefail

if [ "$(id -u)" = "0" ]; then
  echo "Postgres no puede ejecutarse como root: lanza este script con un usuario normal." >&2
  exit 1
fi
cd "$(dirname "$0")/.."

PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb 2>/dev/null || ls -d /usr/lib/postgresql/*/bin/initdb 2>/dev/null | sort -V | tail -1)")}"
DATA="$(mktemp -d)"
PORT="${PGTEST_PORT:-54329}"
trap '"$PG_BIN/pg_ctl" -D "$DATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DATA"' EXIT

"$PG_BIN/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$DATA" -o "-p $PORT -k $DATA -c listen_addresses=''" -l "$DATA/log" start -w >/dev/null

run() { psql -h "$DATA" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

run -f tests/db/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do
  echo "→ migración $(basename "$f")"
  run -f "$f"
done
for f in tests/db/[1-9]*.sql; do
  echo "→ test $(basename "$f")"
  run -o /dev/null -f "$f"
done
echo "✓ Base de datos: todas las pruebas pasan"
