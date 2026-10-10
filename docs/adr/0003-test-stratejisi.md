# ADR-0003: v2 test stratejisi (Vitest + Testing Library + Playwright)

- Tarih: 2026-10-10
- Durum: **Önerildi**
- İlgili: ADR-0001 (ortamlar, migration), ADR-0002 (parser, composer, safe-fetch),
  `.claude/skills/{coding-standards,auth-session,pre-merge-gate}`

## Bağlam

- Her şey Vitest unit testleri ve Playwright E2E ile test edilecek (kullanıcı kararı).
- Ortam: Node 22, npm 10. Chromium `/opt/pw-browsers`'ta (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`,
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` set), `playwright install` yapılamıyor.
  - Yüklü tarayıcı: `chromium-1194` = **Chromium 141.0.7390.37** (Playwright 1.56.x'in revizyonu).
  - Güncel `@playwright/test` 1.64.0 `chromium_headless_shell-1248` arıyor → varsayılan
    ayarla **açılmıyor** (denendi). `executablePath: '/opt/pw-browsers/chromium'` verildiğinde
    1.64 bu Chromium 141'i sorunsuz sürdü (sayfa, contenteditable'a Türkçe karakterli yazım
    denendi).
- Docker CLI var ama bu ortamda daemon çalışmıyor; `/usr/lib/postgresql/16/bin` altında
  Postgres 16 binary'leri ve `psql` var. Java 21 var (Auth emulator için gerekmiyor; Auth
  emulator Node ile çalışır).
- Composer contenteditable (ProseMirror) kullanıyor; jsdom selection/IME/layout'u gerçekçi
  taklit etmiyor.

## Karar 1 — Test katmanları (Vitest 5 `projects`)

| Proje | Ortam | Kapsam | Hız hedefi |
|-------|-------|--------|-----------|
| `unit` | node | `lib/entities` (tablo + `fast-check` özellik testleri), `lib/safe-fetch` (DNS/IP kararları, sahte resolver enjekte), cursor kodlama, Zod şemaları, `errors` → i18n eşlemesi, rate limit hesabı | < 10 sn |
| `dom` | jsdom 30 | Senkron bileşenler: `RichText` (entity → link/escape), `AuthProvider`/`useAuth` durumları, buton/durum bileşenleri (loading/empty/error), form doğrulama mesajları | < 30 sn |
| `integration` | node + **gerçek Postgres** | Tüm `features/*/server/queries.ts` ve `actions.ts`: yetki reddi (anonim, doğrulanmamış e-posta, askıya alınmış, başkasının içeriği, engelleme), iş kuralları (cashtag zorunlu, bilinmeyen cashtag, tag upsert/katlama, mention bildirimi, engellenen kullanıcıya bildirim yok), `ContentEvent` yazımı, cursor pagination sınırları, `contentFormat=1` eski içerik okuma | < 90 sn |
| `browser` | Vitest browser mode (`@vitest/browser-playwright` 5.0.3, Chromium) | Yalnızca composer: dekorasyonlar, `$ # @` popup'ları, klavye (↑↓ Enter Tab Esc), IME composition sırasında tetiklenmeme, HTML yapıştırma → düz metin, sayaç, bilinmeyen cashtag işareti, taslak koruma. Ağ MSW 3 ile | < 60 sn |
| E2E | Playwright 1.64, `next build && next start` | Kritik akışlar uçtan uca (Karar 4) | < 5 dk |

Kurallar:
- Her Server Action ve query için en az: mutlu yol + yetki reddi + bir doğrulama hatası
  (coding-standards). Bug fix → önce kırmızı test.
- Prisma **mock'lanmaz**; integration gerçek DB ile. Mock'lanan sınırlar: `next/headers`
  (`cookies`, `headers`), `next/cache` (`revalidatePath`, `updateTag` çağrıldı mı), `after`
  (senkron çalıştırılır), `server-only`, `lib/auth/session` (`asUser(user)` / `asAnonymous()`
  yardımcıları), `lib/safe-fetch` dış ağı.
- `lib/auth/session.ts`'in kendisi `firebase-admin` mock'u ile unit test edilir
  (`sessionsValidAfter`, `status`, süresi dolmuş cookie, needs-onboarding dalları); gerçek
  token akışı E2E'de emulator ile.
- Kapsam eşiği yalnızca kritik saf modüllerde: `lib/entities` ve `lib/safe-fetch` satır+dal
  ≥ %95. Genel yüzde hedefi yok (metrik oyununa dönüşür).
- Snapshot testi yok (DOM snapshot'ları kırılgan); davranış ve erişilebilir sorgularla
  (`getByRole`) assert.

Paketler (2026-10-10 `npm view`): `vitest` 5.0.3, `@vitest/coverage-v8` 5.0.3,
`@vitest/browser-playwright` 5.0.3 + `playwright` (peer, `@playwright/test` ile aynı sürüm),
`@vitejs/plugin-react` 6.1.2, `vite-tsconfig-paths` 6.1.1, `jsdom` 30.1.2,
`@testing-library/react` 16.3.3, `@testing-library/dom` 10.4.2, `@testing-library/user-event`
14.6.7, `@testing-library/jest-dom` 7.0.1, `msw` 3.0.3, `fast-check` 4.10.2,
`@playwright/test` 1.64.0, `@axe-core/playwright` 4.13.0, `firebase-tools` 15.33.0.
(Vitest 5 Node `^22.12` ister; ortam 22.22 ✓.)

## Karar 2 — Chromium yolu (yerel sandbox ↔ CI)

Tek değişken: `PW_CHROMIUM_EXECUTABLE`.

```ts
// web/playwright.config.ts (özet)
const executablePath = process.env.PW_CHROMIUM_EXECUTABLE || undefined;
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
             { name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: [
    { command: 'npm run emulators', url: 'http://127.0.0.1:9099', reuseExistingServer: !process.env.CI },
    { command: 'npm run build:e2e && npm run start:e2e', url: 'http://localhost:3100', timeout: 180_000,
      reuseExistingServer: !process.env.CI },
  ],
  globalSetup: './tests/e2e/global-setup.ts',
});
```

- **Yerel (bu sandbox):** `web/.env.test.local` → `PW_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`.
  `PLAYWRIGHT_BROWSERS_PATH` zaten `/opt/pw-browsers`; dokunulmaz.
- **CI:** değişken boş → `npx playwright install --with-deps chromium` ile 1.64'ün kendi
  tarayıcısı (cache: `~/.cache/ms-playwright`, anahtar Playwright sürümü).
- Vitest browser mode aynı değişkeni `provider: playwright({ launchOptions: { executablePath } })`
  ile kullanır.
- Risk: yerelde Chromium 141, CI'da 1.64'ün daha yeni Chromium'u → nadir davranış farkı.
  Kabul edilebilir; CI kaynak doğrudur. Sorun çıkarsa geri dönüş: `@playwright/test`'i
  `1.56.1`'e sabitlemek (yereldeki 1194 revizyonuyla birebir), `executablePath`'e gerek kalmaz.
- Mobil projesi aynı Chromium ile Pixel 7 emülasyonu; WebKit M1'de yok (kurulamıyor). iOS Safari
  manuel kontrol listesinde (composer IME, popup).

## Karar 3 — Test veritabanı

**Her ortamda gerçek Postgres, Neon ile aynı ana sürüm** (`PG_MAJOR`, varsayılan 16; Neon prod
sürümü S3'te doğrulanıp eşitlenir).

| Ortam | Nasıl |
|-------|-------|
| CI | GitHub Actions `services.postgres` (`postgres:${PG_MAJOR}`, health-check `pg_isready`), mevcut `sync-stocks-test.yml` ile aynı desen |
| Yerel, docker'lı makine | `web/docker-compose.test.yml` → `postgres:16`, `tmpfs` veri dizini, `-c fsync=off -c synchronous_commit=off -c full_page_writes=off`, port 54329 |
| Yerel, docker daemon'u yok (bu sandbox) | `web/scripts/pg-local.sh start|stop` → `/usr/lib/postgresql/16/bin/initdb` ile `web/.tmp/pg`, aynı ayarlar ve port. Script önce `docker info`'yu dener, yoksa binary'ye düşer |

Bağlantı: `TEST_DATABASE_URL=postgresql://postgres:test@localhost:54329/postgres`.

**İzolasyon (integration):**
1. Vitest `globalSetup`: `bt_template` veritabanını sıfırdan oluşturur, `prisma migrate deploy`
   ile tüm migration'ları uygular (yani testler **gerçek migration'ları** test eder, `db push`
   değil).
2. Her worker için `CREATE DATABASE bt_w<VITEST_POOL_ID> TEMPLATE bt_template` (milisaniyeler);
   `setupFiles` Prisma client'ını bu DB'ye bağlar.
3. Her test dosyasından önce `TRUNCATE ... RESTART IDENTITY CASCADE` (`_prisma_migrations`
   hariç). Test verisi `tests/factories.ts` (`createUser`, `createStock`, `createPost`...) ile.

**Migration testleri** (`npm run db:migrations:check`, CI `integration` job'unda):
- Boş DB → `migrate deploy` → `prisma migrate diff` (DB ↔ `schema.prisma`) boş olmalı.
- Ters sırada tüm `prisma/rollback/*.down.sql` → yeniden `migrate deploy` (geri alınabilirlik).
- **Eski uygulama uyumluluğu:** v2 migration'larından sonra eski uygulamanın yaptığı INSERT'ler
  (yeni kolonları içermeyen ham SQL: `Post`, `Comment`, `Tag`, `_PostStocks`, `Notification`,
  `User`) başarılı olmalı ve DEFAULT'lar doğru gelmeli (`contentFormat = 1` vb.).
- Yıkıcı ifade taraması: expand fazında migration SQL'inde `DROP`, `ALTER ... TYPE`,
  `RENAME`, DEFAULT'suz `NOT NULL` bulunursa job kırmızı (contract migration'ları özel etiketle
  muaf).

**E2E DB:** ayrı `borsaliyorum_e2e` veritabanı; Playwright `globalSetup` migrate + temel seed
(hisseler: `THYAO`, `ASELS`, `SISE`, `BTC`; birkaç etiket). Testler kendi kullanıcı/gönderisini
benzersiz adla oluşturur, yalnızca kendi verisini assert eder → paralel güvenli.

**S3 uygulaması (2026-10-10):**
- Yollar kökte (kararlar K1): `scripts/pg-local.sh`, `tests/db/` (config, admin, global-setup,
  setup-worker, legacy-compat, migration-rules), `tests/factories.ts`,
  `scripts/check-migrations.ts`. Integration job'u ayrı `v2-ci.yml` yerine mevcut
  `.github/workflows/ci.yml`'de (`integration`, `postgres:16` service, port 54329).
- Bu sandbox'ta docker daemon yok → `pg-local.sh` `/usr/lib/postgresql/16/bin` binary'lerini
  kullanır (`initdb` root çalışamadığı için root iken `runuser -u postgres`). Binary yoksa
  `PG_BIN` ile yol verilir ya da `apt-get install postgresql-16`. `docker-compose.test.yml`
  eklenmedi: docker varsa script `docker run postgres:16` (tmpfs) ile aynı işi yapar.
- Testler `TEST_DATABASE_URL`'in host'u yerel değilse başlamaz (`tests/db/config.ts`).
- Her test **dosyası** başında tablolar boşaltılır; aynı dosyadaki testler veri paylaşır →
  testler kendi oluşturdukları satırları assert eder (sayım yerine id/fark).
- `db:migrations:check` ek olarak: rollback sonrası şemanın 4 v1 migration'ına eşitliği
  (`migrate diff --to-migrations`, shadow DB ile), Prisma'nın görmediği nesnelerin
  (fonksiyon/trigger/ifade index'i) varlığı/yokluğu, CONCURRENTLY dosyalarında tek ifade ve her
  v2 migration'ına bir `rollback/*.down.sql`.

## Karar 4 — E2E login: Firebase Auth emulator

- `firebase-tools` 15.33.0 devDependency; `web/firebase.json`:
  `{ "emulators": { "auth": { "host": "127.0.0.1", "port": 9099 }, "ui": { "enabled": false }, "singleProjectMode": true } }`.
  `npm run emulators` = `firebase emulators:start --only auth --project demo-borsaliyorum`.
  `demo-` önekli proje kimliği gerçek bir Firebase projesine **hiç** bağlanmaz, kimlik bilgisi
  gerektirmez.
- E2E build'i ayrı bir build'dir (`build:e2e`), env:
  `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`,
  `FIREBASE_PROJECT_ID=demo-borsaliyorum`, `NEXT_PUBLIC_FIREBASE_API_KEY=fake-api-key`,
  `DATABASE_URL=<e2e DB>`, `SAFE_FETCH_TEST_ALLOW=127.0.0.1:4010`.
  `NEXT_PUBLIC_*` build'e gömüldüğü için E2E artefaktı asla prod'a gitmez.
- Koruma: `VERCEL_ENV === 'production'` iken `FIREBASE_AUTH_EMULATOR_HOST` ya da
  `SAFE_FETCH_TEST_ALLOW` set ise uygulama başlangıçta hata fırlatır (unit testli).
- İstemci SDK: `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` varsa `connectAuthEmulator`.
- Admin SDK emulator modunda imzasız token'ları kabul eder; `createSessionCookie` /
  `verifySessionCookie`'nin emulator davranışı S5'te ilk iş olarak doğrulanır (doğrulanamazsa:
  E2E'de session endpoint'i yerine test-only cookie basma yolu **açılmaz**; emulator sürümü
  yükseltilir ya da sorun belgelenip auth akışı Playwright'ta gerçek UI ile sürdürülür).
- Test kullanıcıları: test sürecinde `firebase-admin` (emulator'a bağlı) ile
  `createUser({ email, password, emailVerified })`; DB tarafı onboarding UI'ı ile ya da
  factory ile. `tests/e2e/support/auth.ts`:
  - `loginViaUi(page, user)` — gerçek form; auth testlerinde kullanılır.
  - `authenticatedState(role)` — worker başına bir kez UI ile giriş, `storageState` kaydı;
    diğer testler bununla başlar.
  - Emulator sıfırlama: `DELETE http://127.0.0.1:9099/emulator/v1/projects/demo-borsaliyorum/accounts`
    (globalSetup'ta).
- Google girişi: emulator'ün sahte Google popup'ı ile bir test.
- `__session` `Secure` olduğu hâlde `http://localhost`'ta çalışır (Chromium localhost'u güvenli
  bağlam sayar).

### M1 E2E senaryoları

| Spec | Assert |
|------|--------|
| `auth.flash.spec.ts` | Girişli kullanıcı `/akis`'i yeniler: `addInitScript` ile kurulan `MutationObserver` "Giriş yap" test-id'sinin **hiçbir karede** DOM'a girmediğini kaydeder; ilk HTML (`request.get`) avatarı içerir |
| `auth.session.spec.ts` | `__session` cookie'si HttpOnly/Secure/SameSite=Lax; JWT `exp - iat ≥ 13 gün` (eski 1 saatlik ID token hatasının regresyonu) |
| `auth.register.spec.ts` | Kayıt → doğrulanmamış kullanıcı okuyabilir, composer "e-postanı doğrula" durumunda → emulator'de doğrula → onboarding (kullanıcı adı kuralları, rezerve ad, KVKK linki, işaretsiz pazarlama kutusu) → `/akis` |
| `auth.login.spec.ts` | Yanlış şifre → alan belirtmeyen i18n mesajı; buton basıldığı an disabled + spinner; `next` parametresine dönüş |
| `auth.logout.spec.ts` | Çıkış → UI anında anonim; geri tuşu korumalı içeriği göstermez; DB'de `sessionsValidAfter` ileri alınmış cookie → login'e tek yönlendirme, döngü yok |
| `composer.spec.ts` | `$thy` → THYAO önerisi, Enter ile `$THYAO ` eklenir, vurgulu; `@` ve `#` aynı; bilinmeyen `$XXXX` işaretli ve gönderim `UNKNOWN_CASHTAG`; 1001 karakterde gönder pasif |
| `post.create.spec.ts` | Gönderi oluştur → akışın başında, entity'ler link, cashtag linki `/hisse/THYAO`; oturum süresi dolmuşken gönder → toast + taslak korunur |
| `link-preview.spec.ts` | Yerel fixture HTML sunucusu (`127.0.0.1:4010`, yalnızca `SAFE_FETCH_TEST_ALLOW` ile izinli) → composer'da kart, gönderide kart; `http://169.254.169.254/` önizleme üretmez |
| `post.detail.spec.ts` | Detay sayfası anonim açılır (yorumlar görünür, composer yerine giriş çağrısı), girişli yorum yazar, beğenir, kendi yorumunu siler; silinmiş gönderi 404 |
| `a11y.spec.ts` | `@axe-core/playwright` ile landing, giriş, akış, detay: `serious`/`critical` ihlal yok |

## Karar 5 — CI (`.github/workflows/v2-ci.yml`)

Tetikleyici: `pull_request` ve `push: main`, `paths: [web/**, .github/workflows/v2-*.yml]`.
`concurrency: v2-ci-${{ github.ref }}`, PR'larda `cancel-in-progress: true`.
`defaults.run.working-directory: web`. Node 22, `actions/setup-node` npm cache
(`cache-dependency-path: web/package-lock.json`).

| Job | Adımlar | Süre sınırı |
|-----|---------|-------------|
| `static` | `npm ci` → `type-check` → `lint` → `format:check` → `vitest --project unit --project dom --coverage` | 10 dk |
| `integration` | postgres service → `npm ci` → `prisma generate` → `db:migrations:check` → `vitest --project integration` | 15 dk |
| `browser` | `npm ci` → `npx playwright install --with-deps chromium` (cache'li) → `vitest --project browser` | 10 dk |
| `e2e` | postgres service → `npm ci` → playwright install → `.next/cache` cache → `npx playwright test` (webServer emulator + build + start'ı kendisi başlatır) → başarısızlıkta `playwright-report/` ve trace'ler artifact | 25 dk |
| `root-guard` (her PR'da, path filtresiz) | Kökte `npm ci --ignore-scripts` → `npx tsc --noEmit -p .` → kök `tsconfig.json`'ın `web`'i dışladığını doğrula. Eski prod build'inin v2 yüzünden kırılmasını yakalar | 10 dk |

- Branch protection: bu beş job zorunlu check (kullanıcı GitHub ayarı yapar).
- Prod migration ayrı workflow: `v2-migrate.yml`, `workflow_dispatch` + `environment: production`
  (manuel onay), `prisma migrate deploy` doğrudan URL ile. Cutover'a kadar prod DB'ye hiç
  uygulanmaz.
- Secrets: CI testleri **hiçbir gerçek secret kullanmaz** (emulator + yerel PG). Fork PR'ları
  güvenle çalışır.
- Flaky politikası: CI'da `retries: 2`; retry ile geçen test raporda görünür, bir hafta içinde
  düzeltilir ya da issue açılır. `test.skip` ile susturma code review'da gerekçe ister.

## Karar 6 — `web/package.json` script'leri (pre-merge-gate ile uyumlu)

```
dev, build, start, type-check (tsc --noEmit), lint (eslint . --max-warnings=0),
format, format:check,
test            → vitest run --project unit --project dom --project integration   (DB gerekir)
test:unit       → vitest run --project unit --project dom
test:browser    → vitest run --project browser
test:e2e        → playwright test
db:test:up      → scripts/pg-local.sh start   (docker varsa compose)
db:migrations:check, emulators, build:e2e, start:e2e (next start -p 3100)
```

`pre-merge-gate`'in beklediği sıra (`npm ci → type-check → lint → test → build → test:e2e`)
aynen çalışır; composer değiştiyse `test:browser` de.

## Alternatifler

- **Jest:** Vite/ESM uyumu ve hız açısından Vitest daha basit; Next 16 + ESM'de Jest ek
  dönüşüm ayarı ister. Reddedildi.
- **Composer testini jsdom'da yapmak:** ProseMirror selection/IME jsdom'da güvenilmez →
  yanlış güven. Reddedildi.
- **Composer'ı yalnızca Playwright E2E ile test etmek:** çalışır ama her senaryo için build +
  giriş gerekir, yavaş. Vitest browser mode bileşeni izole ve hızlı test eder; E2E yalnızca
  entegrasyon (gönderim) senaryosunu kapsar.
- **Testcontainers:** bu ortamda docker daemon yok; GitHub service container ile aynı sonucu
  daha basit veriyor.
- **PGlite (WASM Postgres):** hızlı ama Neon'la birebir değil (uzantı/davranış farkı), Prisma
  adapter ayrı. Gerçek PG tercih edildi.
- **Prisma'yı mock'lamak:** sorgu doğruluğunu (index'li cursor, engelleme filtresi) test
  etmez. Reddedildi.
- **E2E'de test-only "cookie bas" endpoint'i ile login:** hızlı ama üretim koduna arka kapı.
  Emulator ile gerçek akış tercih edildi; hız için `storageState` yeterli.

## Sonuçlar

- (+) Aynı testler yerelde (docker'lı ya da docker'sız) ve CI'da çalışır; hiçbir test prod
  Firebase/Neon'a dokunmaz.
- (+) Migration'lar, eski uygulama uyumluluğu dahil, her PR'da test edilir.
- (+) Eski auth hatasının üç belirtisi (flash, 1 saatlik token, yönlendirme döngüsü) regresyon
  testi olarak kalıcı.
- (−) Yerel Chromium (141) ile CI Chromium'u farklı sürüm; gerekirse Playwright 1.56.1'e sabitleme.
- (−) E2E için ayrı build (~1-2 dk) gerekir.
