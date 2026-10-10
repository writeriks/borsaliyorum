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
