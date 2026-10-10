#!/usr/bin/env bash
# Yerel test Postgres'i (ADR-0003 Karar 3). Prod/Neon'a asla bağlanmaz: yalnızca localhost:54329.
#
#   scripts/pg-local.sh start   # docker varsa postgres:16 container, yoksa yerel PG16 binary'leri
#   scripts/pg-local.sh stop
#   scripts/pg-local.sh status
#   scripts/pg-local.sh url     # TEST_DATABASE_URL'i yazdırır
#
# Ayarlar (env): PG_PORT (54329), PG_MAJOR (16), PG_LOCAL_DIR (.tmp/pg), PG_BIN (otomatik)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_PORT="${PG_PORT:-54329}"
PG_MAJOR="${PG_MAJOR:-16}"
PG_PASSWORD=test
CONTAINER=borsaliyorum-test-pg
DATA_DIR="${PG_LOCAL_DIR:-$ROOT/.tmp/pg}"
URL="postgresql://postgres:${PG_PASSWORD}@localhost:${PG_PORT}/postgres"
# Veri kalıcılığı gerekmez; testler her koşuda şablon DB'yi yeniden kurar
PG_FAST_OPTS=(-c fsync=off -c synchronous_commit=off -c full_page_writes=off -c max_connections=200)

has_docker() { command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; }

find_pg_bin() {
  if [[ -n "${PG_BIN:-}" ]]; then
    echo "$PG_BIN"
    return
  fi
  for dir in "/usr/lib/postgresql/${PG_MAJOR}/bin" "/opt/homebrew/opt/postgresql@${PG_MAJOR}/bin" \
    "/usr/local/opt/postgresql@${PG_MAJOR}/bin"; do
    if [[ -x "$dir/initdb" ]]; then
      echo "$dir"
      return
    fi
  done
  echo "PostgreSQL ${PG_MAJOR} binary'leri bulunamadı. Docker'ı başlat ya da PG_BIN=<.../bin> ver." >&2
  echo "Debian/Ubuntu: apt-get install postgresql-${PG_MAJOR}" >&2
  exit 1
}

# initdb/postgres root olarak çalışmaz; root isek postgres kullanıcısına geçilir
as_pg() {
  if [[ "$(id -u)" -eq 0 ]]; then
    runuser -u postgres -- "$@"
  else
    "$@"
  fi
}

is_ready() { "$(find_pg_bin)/pg_isready" -q -h localhost -p "$PG_PORT"; }

start_docker() {
  if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then return; fi
  docker run -d --rm --name "$CONTAINER" -e POSTGRES_PASSWORD="$PG_PASSWORD" \
    -p "${PG_PORT}:5432" --tmpfs /var/lib/postgresql/data "postgres:${PG_MAJOR}" \
    "${PG_FAST_OPTS[@]}" >/dev/null
  for _ in $(seq 1 50); do
    if docker exec "$CONTAINER" pg_isready -q -U postgres; then return 0; fi
    sleep 0.2
  done
  echo "Container hazır olmadı." >&2
  exit 1
}

start_local() {
  local bin pwfile
  bin="$(find_pg_bin)"
  if is_ready; then return; fi
  mkdir -p "$DATA_DIR"
  if [[ "$(id -u)" -eq 0 ]]; then chown -R postgres "$DATA_DIR"; fi
  if [[ ! -f "$DATA_DIR/PG_VERSION" ]]; then
    pwfile="$(mktemp)"
    echo "$PG_PASSWORD" >"$pwfile"
    chmod 644 "$pwfile"
    as_pg "$bin/initdb" -D "$DATA_DIR" -U postgres --pwfile="$pwfile" -A scram-sha-256 \
      -E UTF8 --locale=C.UTF-8 >/dev/null
    rm -f "$pwfile"
  fi
  as_pg "$bin/pg_ctl" -D "$DATA_DIR" -l "$DATA_DIR/server.log" -w \
    -o "-p $PG_PORT -k /tmp -c listen_addresses=localhost ${PG_FAST_OPTS[*]}" start >/dev/null
  for _ in $(seq 1 50); do
    if is_ready; then return 0; fi
    sleep 0.2
  done
  echo "Postgres ${PG_PORT} portunda hazır olmadı; log: $DATA_DIR/server.log" >&2
  exit 1
}

stop_local() {
  [[ -f "$DATA_DIR/postmaster.pid" ]] || return 0
  as_pg "$(find_pg_bin)/pg_ctl" -D "$DATA_DIR" -m fast stop >/dev/null
}

case "${1:-}" in
  start)
    if has_docker; then
      start_docker
      mode=docker
    else
      start_local
      mode="yerel binary"
    fi
    echo "Postgres hazır ($mode): $URL"
    ;;
  stop)
    if has_docker && docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
      docker stop "$CONTAINER" >/dev/null
    else
      stop_local
    fi
    ;;
  status)
    if is_ready; then
      echo "çalışıyor: $URL"
    else
      echo "kapalı"
      exit 1
    fi
    ;;
  url) echo "$URL" ;;
  *)
    echo "Kullanım: $0 start|stop|status|url" >&2
    exit 2
    ;;
esac
