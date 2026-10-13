#!/usr/bin/env bash
# Prod baseline/drift raporu (ADR-0001 "Baseline"). YALNIZCA OKUR: prod'a hiçbir şey yazmaz,
# migration uygulamaz. Kullanıcı (ops) çalıştırır; çıktı S3 PR açıklamasına eklenir.
#
#   DATABASE_URL_UNPOOLED='<prod, salt-okunur rol, doğrudan (pooler olmayan) URL>' \
#   SHADOW_DATABASE_URL='<boş, atılabilir bir DB; ör. yerel: postgresql://postgres:test@localhost:54329/shadow>' \
#   scripts/prod-baseline-check.sh
#
# Rapor:
#   1. PostgreSQL sürümü (ADR-0003: test PG ana sürümü bununla aynı olmalı)
#   2. `prisma migrate status` → _prisma_migrations'ta hangi migration'lar kayıtlı
#   3. Drift: 4 v1 migration'ının ürettiği şema → prod şeması. Boş = drift yok. Doluysa çıkan SQL
#      v1 baseline'ı prod'a getirir; aynen `<ts>_baseline_fix/migration.sql` olur (ADR-0001).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

: "${DATABASE_URL_UNPOOLED:?prod salt-okunur doğrudan URL gerekli}"
: "${SHADOW_DATABASE_URL:?boş bir shadow DB URL gerekli (prod OLMAMALI)}"
if [[ "$SHADOW_DATABASE_URL" == "$DATABASE_URL_UNPOOLED" ]]; then
  echo "SHADOW_DATABASE_URL prod ile aynı olamaz (shadow DB sıfırlanır)." >&2
  exit 1
fi
export DATABASE_URL="$DATABASE_URL_UNPOOLED"

legacy_dir="$(mktemp -d)"
trap 'rm -rf "$legacy_dir"' EXIT
cp prisma/migrations/migration_lock.toml "$legacy_dir/"
for dir in prisma/migrations/2025*/; do cp -r "$dir" "$legacy_dir/"; done

echo "== 1. PostgreSQL sürümü"
if command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL_UNPOOLED" -Atc 'SHOW server_version'
else
  echo "(psql yok; Neon panelinden bakın)"
fi

echo
echo "== 2. prisma migrate status"
npx prisma migrate status || true

echo
echo "== 3. Drift: v1 baseline → prod (boş script = drift yok)"
# Yön önemli: baseline_fix migration'ı, migration geçmişini (v1) prod'un GERÇEK şemasına getiren
# SQL'dir. Boş bir DB'de v1 + baseline_fix = prod; prod'da ise `migrate resolve --applied` ile
# yalnızca kayıt olarak işaretlenir. Ters yön (prod → v1) prod'u değiştiren SQL üretirdi.
set +e
npx prisma migrate diff --from-migrations "$legacy_dir" --to-config-datasource --script --exit-code
code=$?
set -e
case "$code" in
  0) echo "SONUÇ: drift yok." ;;
  2) echo "SONUÇ: DRIFT VAR. Yukarıdaki SQL v1 baseline'ı prod'a getirir: <ts>_baseline_fix/migration.sql olarak eklenir, prod'da 'migrate resolve --applied' ile işaretlenir (ADR-0001)." ;;
  *) echo "SONUÇ: diff çalıştırılamadı (çıkış $code)." ;;
esac
exit "$code"
