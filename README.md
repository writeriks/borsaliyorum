# Borsalıyorum

Türkiye odaklı borsa/yatırım sosyal platformu. Bu dal **v2** yeniden yazımıdır; v1 kodu
yalnızca referans için `legacy/` altındadır (build/lint/test dışı). Kararlar: `docs/plan/kararlar.md`,
`docs/adr/`.

## Gereksinimler

- Node 22 (`.nvmrc`), npm 10
- Ortam değişkenleri: `.env.example` → `.env.local`

## Komutlar

```bash
npm ci
npm run dev           # geliştirme sunucusu
npm run type-check    # tsc --noEmit
npm run lint          # ESLint, 0 uyarı
npm run format        # Prettier (format:check CI'da)
npm run test:unit     # Vitest unit + dom projeleri
npm run test          # unit + dom + integration (integration DB'si S3'te)
npm run test:browser  # Vitest browser mode (Chromium)
npm run build         # production build (env doğrulamalı)
npm run test:e2e      # Playwright; kendi build'ini alır (SKIP_ENV_VALIDATION=1) ve 3100'de başlatır
```

Env'siz yerel build: `SKIP_ENV_VALIDATION=1 npm run build`.

### Yerel Playwright tarayıcısı

`playwright install` yapılamayan ortamlarda önceden kurulu Chromium kullanılır:

```bash
echo 'PW_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium' > .env.test.local
```

CI'da değişken boştur; `npx playwright install --with-deps chromium` kullanılır.

## Hisse listesi senkronizasyonu

`scripts/fetch-kap-stocks.mjs` KAP'tan hisse listesini çeker, `scripts/sync-stocks.mjs`
`Stock` tablosuna ekler (varsayılan dry-run; `--apply`, `--max-new=N`). Haftalık çalışır:
`.github/workflows/sync-stocks.yml`.

## Bakım işleri (saklama süresi temizliği)

`scripts/purge-retention.ts` (`.github/workflows/purge-retention.yml`, her gün) DB saklama
sürelerini uygular ve onboarding'i 30 günde tamamlamayan Firebase hesaplarını siler.
**Varsayılan dry-run**: script yalnızca `--execute` ile siler. Ayrıntı ve frenler: ADR-0001
"Yetim hesap imhası".

GitHub'da bir kez yapılacak ayarlar (Settings):

1. **Environments → New environment → `production-purge`**
   - *Deployment protection rules → Required reviewers*: onaylayacak kişi(ler)i ekle.
     (*Prevent self-review* açılabilir.) Firebase işi her koşuda bu onayı bekler.
   - *Deployment branches and tags → Selected branches*: yalnızca `main`.
   - *Environment secrets*: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
     `FIREBASE_PRIVATE_KEY` (bakım için ayrı, yalnızca `Firebase Authentication Admin` rolü
     olan bir service account önerilir).
   - *Environment variables*: `ORPHAN_PURGE_ENABLED` = `true` (yalnızca gerçek silme
     istendiğinde; yoksa Firebase adımı yalnızca sayar).
2. **Secrets and variables → Actions → Repository secrets**: `DATABASE_URL` (roller ayrılınca
   `app_maintenance`). Repo düzeyinde tanımlı `FIREBASE_*` secret'ları varsa **sil**: Firebase
   kimlik bilgileri yalnızca onaylı environment'ta dursun.
3. **Repository variables**: `RETENTION_PURGE_EXECUTE` = `true` — zamanlanmış koşunun gerçekten
   silmesi için (yoksa her gün yalnızca dry-run raporu üretilir).
4. Her ortamın veritabanına bir kez ortam etiketi ekle (Firebase projesi ile eşleşmeyen DB'de
   yetim imhası çalışmaz):

   ```sql
   INSERT INTO "DeploymentEnvironment" ("id", "firebaseProjectId", "label")
   VALUES (1, '<FIREBASE_PROJECT_ID>', 'production');
   ```
