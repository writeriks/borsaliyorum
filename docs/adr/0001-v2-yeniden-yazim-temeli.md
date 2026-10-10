# ADR-0001: v2 yeniden yazımının temeli (yer, stack, veri, auth)

- Tarih: 2026-10-10
- Durum: **Önerildi** (karar gerekli maddeler işaretli; kullanıcı onayından sonra "Kabul edildi")
- İlgili: `docs/audit/2026-10-auth-audit.md`, `.claude/skills/{coding-standards,auth-session}`,
  ADR-0002 (composer), ADR-0003 (test), `docs/plan/v2-milestone-1.md`

## Bağlam

- Prod, `main`'deki v0.1 koduyla (Next 14.2, Prisma 5, Firebase Auth, Redux) Vercel'de çalışıyor.
  v2 geliştirilirken prod **hiçbir anda** bozulmamalı.
- Prod veritabanı Neon Postgres (doğrulanacak). Şema hem `prisma migrate` (4 migration) hem
  `prisma db push` (`package.json` → `get-latest` script'i) ile yönetilmiş → **drift olası**.
- Haftalık GitHub Action (`sync-stocks.yml`) prod `Stock` tablosuna yazıyor ve kök
  `tsconfig.json` ile `tsc` çalıştırıyor.
- Kök `tsconfig.json` `include: ["**/*.ts", "**/*.tsx"]` → repoya eklenen **her** `.ts` dosyası
  eski uygulamanın `next build` type-check'ine girer. Bu, "aynı repo" seçeneğinin en büyük tuzağı.
- Eski içerik formatı: gönderi metni react-mentions markup'ı ile saklanıyor: `$(THYAO)`,
  `#(bist100)`, `@(ali)`. v2 bu veriyi okumak zorunda.
- Eski Google kullanıcılarında `username = email` (audit bulgu H) → bu kullanıcı adları v2 kuralına
  (`^[a-z0-9_]{3,20}$`) uymuyor.

## Karar 1 — v2 nerede yaşar: aynı repoda `web/` dizini (karar gerekli)

**Öneri:** Aynı repo, kökte bağımsız bir Next.js uygulaması olarak `web/` dizini (kendi
`package.json` + `package-lock.json`'u; npm workspaces **yok**). İkinci bir Vercel projesi
`Root Directory = web` ile bağlanır.

| Seçenek | Artı | Eksi |
|---------|------|------|
| **A. Aynı repo, `web/` (öneri)** | Eski kod (iş kuralı referansı) ve `.claude/` agent/skill'leri aynı yerde; tek PR akışı; `pre-merge-gate` tek repoda; cutover sonrası eski kodu silmek tek PR | Eski build'i izole etmek için 3 küçük kök değişikliği gerekir (aşağıda) |
| B. Yeni repo | Tam izolasyon | Agent/skill/CLAUDE.md ikiye bölünür; eski kodu referans almak zorlaşır; issue/PR geçmişi kopar; stock sync gibi ortak işler iki yerde |
| C. Uzun ömürlü branch'te kökte yeniden yazım | — | `main`'e merge edilemez (prod'u değiştirir); aylarca ayrık branch, conflict cehennemi |
| D. npm/pnpm workspaces monorepo | Paylaşılan paket mümkün | Paylaşılacak kod yok (eski kod referans, import edilmez); gereksiz araç karmaşıklığı |

**Prod'u koruyan zorunlu kök değişiklikleri (Milestone-1 dilim S0, `web/` koduyla aynı ya da
önceki PR'da `main`'e gider):**

1. Kök `tsconfig.json` → `"exclude": ["node_modules", "web"]`. (Yapılmazsa eski `next build`
   `web/` dosyalarını type-check eder ve **prod deploy kırılır**.)
2. Eski Vercel projesi → *Settings → Git → Ignored Build Step*:
   `git diff --quiet HEAD^ HEAD -- . ':(exclude)web' ':(exclude)docs' ':(exclude).claude'`
   (çıkış 0 = build atla). Sadece `web/` değişen commit'ler eski projeyi yeniden deploy etmez.
3. `package.json` → `get-latest` script'indeki `npx prisma db push` kaldırılır. Eski şemayla
   `db push`, v2'nin eklediği tablo/kolonları **silmeye çalışır**. Prod şemasının tek sahibi
   bundan sonra `web/prisma/migrations`'tır.

**v2 Vercel projesi (`borsaliyorum-v2`):** Root Directory `web`, Node 22, Function Region `fra1`
(Neon `eu-central-1` ise yanında; Neon bölgesi doğrulanacak), "Include source files outside of
the Root Directory" kapalı, Ignored Build Step: `git diff --quiet HEAD^ HEAD -- .`. Cutover'a
kadar alan adı `beta.borsaliyorum.com` (ya da Vercel Deployment Protection arkasında
`*.vercel.app`), tüm yanıtlarda `X-Robots-Tag: noindex` (env ile).

**Cutover (Milestone-1 dışında, runbook ayrı yazılacak):**
1. Expand migration'ları prod'a uygulanır (eski uygulama etkilenmez, bkz. Karar 3).
2. Prod alan adı eski projeden v2 projesine taşınır (Vercel Domains). Rollback = alan adını geri
   taşımak (dakikalar).
3. Eski URL'ler v2'de 301 ile yeni yollara (`next.config.ts` `redirects()`):
   `/tr/feed → /akis`, `/tr/posts/:id → /gonderi/:id`, `/tr/users/:u → /u/:u`,
   `/tr/stocks/:t → /hisse/:t` (eski linklerde `$` öneki vardı, temizlenir), `/tr/tags/:t → /etiket/:t`.
4. Kullanıcılar cutover'da **bir kez yeniden giriş yapar** (eski `identity` cookie'si geçersiz,
   v2 `__session` kullanır; Firebase hesapları aynı olduğu için veri kaybı yok).
5. Rollback penceresi (öneri 14 gün) bitince contract migration'ları ve kök eski kod silinir;
   `web/` köke taşınması gerekmez.

## Karar 2 — Stack ve sürümler

Sürümler 2026-10-10'da `npm view` ile doğrulandı. `^` yerine minor'a sabit (`~`) ve
`package-lock.json` zorunlu; Renovate/Dependabot haftalık.

| Katman | Paket | Sürüm | Not |
|--------|-------|-------|-----|
| Runtime | Node | 22 LTS | Vercel + CI + yerel aynı (`engines`, `.nvmrc`) |
| Framework | `next` | 16.4.0 | App Router, Turbopack varsayılan. `middleware.ts` yerine `proxy.ts`. `next lint` yok → ESLint CLI |
| UI | `react`, `react-dom` | 19.3.0 | |
| Dil | `typescript` | **6.0.3** | `latest` 7.0.2 ama `typescript-eslint@8.71` peer'i `<6.1.0`; TS 7'ye typescript-eslint desteği gelince geçilir |
| Lint | `eslint` 9.39.5 + `eslint-config-next` 16.4.0 + `typescript-eslint` 8.71.1 | | ESLint 10 değil: `eslint-plugin-react` peer'i `^9.7`'de bitiyor |
| Format | `prettier` 3.9.10 + `prettier-plugin-tailwindcss` 0.8.1 | | Kurallar `coding-standards`'taki gibi |
| ORM | `prisma`, `@prisma/client`, `@prisma/adapter-pg` | **7.10.0** | `prisma` CLI'ın `latest` tag'i `8.0.0-rc.22` (RC!) → CLI açıkça `7.10.0`'a sabitlenir, client ile aynı |
| DB sürücüsü | `pg` | 8.x (adapter bağımlılığı) | Bkz. Karar 3 "sürücü" |
| Auth | `firebase` 13.0.0, `firebase-admin` 14.5.0 | | admin 14 Node ≥ 22 ister |
| i18n | `next-intl` | 4.14.9 | `localePrefix: 'as-needed'` → `tr` öneksiz, `en` `/en/...` |
| İstemci veri | `@tanstack/react-query` | 5.104.1 | Sadece etkileşimli istemci verisi (sonsuz akış, autocomplete, link önizleme) |
| Doğrulama | `zod` | 4.6.5 | Sunucu+istemci ortak şemalar |
| Form | `react-hook-form` 7.89.0 + `@hookform/resolvers` 5.9.1 | | |
| Stil | `tailwindcss` + `@tailwindcss/postcss` | 4.3.3 | Token'lar CSS değişkeni (`@theme`), tasarım ui-ux-designer'dan |
| Bileşen | shadcn CLI 4.21.4 (Radix), `lucide-react` 1.55.0, `sonner` 2.0.8, `next-themes` 0.4.6 | | |
| Editör | `@tiptap/*` 3.31.4 | | ADR-0002 |
| HTML parse (link önizleme) | `htmlparser2` | 12.0.0 | jsdom yerine; script çalıştırmaz, stream |
| Vercel yardımcı | `@vercel/functions` | 3.9.11 | `attachDatabasePool` (Fluid compute) |
| Test | `vitest` 5.0.3, `@testing-library/react` 16.3.3, `@playwright/test` 1.64.0 | | ADR-0003 |

**Bilinçli olarak eklenmeyenler:** Redux/redux-persist, Zustand (ihtiyaç doğana kadar), Redis/
Upstash (rate limit Postgres'te, aşağıda), ayrı logger kütüphanesi (`lib/logger` küçük JSON
sarmalayıcı, Vercel log'ları yeterli), event bus/kuyruk (arka plan iş için `after()`).

**Next 16 notları (uygulamaya yön verir):**
- `cacheComponents` M1'de **kapalı**; akış kişiselleştirilmiş ve cookie okuyan layout zaten
  dinamik. Önbellek yalnızca açıkça kazandıran yerde: hisse indeksi (`'use cache'` +
  `cacheTag('stocks')`, günlük). Mutasyonlarda `revalidatePath`/`updateTag`.
- `proxy.ts` sadece i18n + iyimser `__session` varlık kontrolü (auth-session skill).
- `cookies()`, `headers()`, `params` async.

## Karar 3 — Veri: aynı Neon prod DB, expand/contract, tek migration sahibi (karar gerekli)

### Ortamlar

| Ortam | DB | Firebase projesi | İçerik |
|-------|----|------------------|--------|
| Yerel / unit+integration test | Docker `postgres:16` ya da yerel PG 16 binary'si | Auth emulator (`demo-borsaliyorum`) | Sentetik seed |
| CI | GitHub Actions `postgres:16` service | Auth emulator | Sentetik seed |
| Preview (Vercel) | Neon `v2-dev` branch'i (prod'dan **değil**, sentetik seed'li kök branch'ten) | Ayrı `borsaliyorum-dev` projesi | Sentetik |
| Staging (opsiyonel) | Neon prod branch'i (copy-on-write) | prod Firebase | **Gerçek kişisel veri** → bkz. legal sorusu L6 |
| Prod (cutover sonrası) | Mevcut prod Neon DB | Mevcut Firebase projesi | |

**Öneri (karar gerekli K2):** v2 cutover'da **aynı prod DB'yi** kullanır; veri taşıma yok.
Alternatif "yeni DB + ETL" reddedildi: ~10 tablo için ETL, kesinti penceresi ve ikinci bir
doğruluk kaynağı getirir, kazancı yok. Eski ve yeni uygulamanın aynı DB'ye **uzun süre birlikte
yazması önerilmez**; birlikte yazma yalnızca rollback penceresinde olur (aşağıdaki riskler).

### Şema stratejisi

- `web/prisma/schema.prisma` mevcut tabloları **`@@map`/`@map` ile** temiz isimlere eşler
  (tablo/kolon adı değişmez, DB'de rename yok). Ör. `model PostStock { postId Int @map("A")
  stockId Int @map("B") @@unique([postId, stockId]) @@map("_PostStocks") }` — eski uygulamanın
  implicit m2m tablosunu v2 explicit model olarak kullanır; ikisi aynı tabloyu okur.
- **Baseline:** S3 diliminde prod'a salt-okunur rolle `prisma migrate diff` (DB ↔ şema) çalışır.
  - Prod `_prisma_migrations` 4 eski migration'ı içeriyor ve drift yoksa: bu 4 klasör aynen
    (checksum korunarak) `web/prisma/migrations`'a kopyalanır, yeni migration'lar üstüne eklenir.
  - Drift varsa: drift'i kapatan `..._baseline_fix` migration'ı yazılır, prod'da
    `prisma migrate resolve --applied` ile işaretlenir. Kök `prisma/migrations` bundan sonra
    donmuştur.
- **Expand-only (cutover + rollback penceresi boyunca):** sadece yeni tablo, nullable ya da
  `DEFAULT`'lu yeni kolon, yeni index. Eski Prisma 5 client'ı bilmediği kolonları seçmez; eski
  INSERT'ler DEFAULT ile doğru değeri alır. DROP/RENAME/TYPE değişikliği yalnızca contract
  fazında.
- Her migration için `web/prisma/rollback/<migration>.down.sql` elle yazılır (Prisma down
  üretmez) ve CI'da up→down→up ile test edilir (ADR-0003).
- Prod migration'ı **Vercel build'inde çalışmaz** (preview build'leri prod'u migrate ederdi).
  `main`'e merge sonrası GitHub Actions `production` environment'ında (manuel onaylı)
  `prisma migrate deploy`, doğrudan (pooler olmayan) URL ile.
- Ayrı DB rolleri (öneri, ops işi): `app_rw` (DML, runtime) ve `migrator` (DDL, sadece CI).
  Eski uygulama da `app_rw`'ye alınırsa yanlışlıkla `db push` imkânsızlaşır.

### Sürücü

`@prisma/adapter-pg` + Neon **pooled** connection string (runtime), `attachDatabasePool`
(Vercel Fluid compute). `@prisma/adapter-neon` (HTTP/WebSocket) yerine seçildi çünkü yerel/CI'daki
düz Postgres ile **aynı sürücü** çalışır (test-prod paritesi) ve interaktif transaction sorunsuz.
Prisma 7'de URL'ler `prisma.config.ts`'te: CLI (migrate) doğrudan URL, runtime pooled URL.
pg havuzu: `max: 5`, `connectionTimeoutMillis: 5000` (pg varsayılanı 0 = sonsuz).

### Milestone-1 şema değişiklikleri (hepsi additive)

```prisma
// web/prisma/schema.prisma — yalnızca M1 farkları (mevcut alanlar aynen eşlenir)

model User {
  // mevcut: userId, firebaseUserId, username, displayName, email, birthday, ... (değişmez)
  createdAt           DateTime  @default(now())          // + DB DEFAULT (metadata-only)
  onboardedAt         DateTime?                         // null → onboarding zorunlu
  sessionsValidAfter  DateTime?                         // çıkış/ban: daha eski auth_time'lı oturumlar geçersiz
  status              UserStatus @default(active)
  noticeVersion       String?   @db.VarChar(20)         // kabul edilen aydınlatma metni sürümü  [legal L3]
  ageConfirmedAt      DateTime?                         // 18+ beyanı                           [legal L3]
  marketingOptInAt    DateTime?                         // ayrı, işaretsiz onay                  [legal L3]
}
enum UserStatus { active suspended deleted }

model Post {
  contentFormat Int        @default(1) @db.SmallInt     // 1 = eski markup "$(X)", 2 = düz metin (ADR-0002)
  entities      Json?                                    // ADR-0002 Entity[] (+ çözülmüş id'ler)
  deletedAt     DateTime?
  linkPreviewId Int?
  linkPreview   LinkPreview? @relation(fields: [linkPreviewId], references: [id], onDelete: SetNull)
  @@index([createdAt(sort: Desc), postId(sort: Desc)])                 // global akış cursor
  @@index([userId, createdAt(sort: Desc), postId(sort: Desc)])         // takip akışı / profil
}

model Comment {
  updatedAt     DateTime  @default(now())                // + DB DEFAULT
  contentFormat Int       @default(1) @db.SmallInt
  entities      Json?
  deletedAt     DateTime?
  @@index([postId, createdAt, commentId])                              // detay sayfası cursor
}

model Tag {
  slug String? @db.VarChar(64)   // katlanmış ad (ADR-0002); backfill + tekilleştirme sonrası UNIQUE
}

model LinkPreview {               // ADR-0002 §6
  id          Int       @id @default(autoincrement())
  urlHash     String    @unique @db.Char(64)   // sha256(normalize(url))
  url         String
  finalUrl    String?
  status      LinkPreviewStatus
  siteName    String?   @db.VarChar(100)
  title       String?   @db.VarChar(200)
  description String?   @db.VarChar(300)
  fetchedAt   DateTime  @default(now())
  expiresAt   DateTime
  posts       Post[]
}
enum LinkPreviewStatus { ok failed blocked }

model ContentEvent {              // 5651 / moderasyon izi — append-only
  id          BigInt   @id @default(autoincrement())
  at          DateTime @default(now())
  actorUserId Int
  action      String   @db.VarChar(40)   // 'post.create' | 'post.delete' | 'comment.create' | ...
  entityType  String   @db.VarChar(20)
  entityId    Int
  ip          String?  @db.Inet          // [legal L2]
  userAgent   String?  @db.VarChar(300)
  requestId   String?  @db.VarChar(64)
  @@index([actorUserId, at])
  @@index([entityType, entityId])
}

model RateLimitBucket {
  key         String   @db.VarChar(120)  // 'post.create:u:42'
  windowStart DateTime
  count       Int      @default(0)
  @@id([key, windowStart])
}
```

Migration'a elle eklenen SQL:
- `ContentEvent` için `BEFORE UPDATE OR DELETE` trigger'ı → `RAISE EXCEPTION` (append-only).
  Saklama süresi dolanların silinmesi yalnızca `SET LOCAL borsaliyorum.retention_purge = 'on'`
  ile çalışan bir purge fonksiyonu üzerinden (süre: legal L2).
- `Tag.slug` backfill: önce `UPDATE` (katlama fonksiyonu SQL'de `translate(lower(...))`), sonra
  çakışan tag'ler için birleştirme script'i (`_PostTags` satırlarını taşı), sonra
  `CREATE UNIQUE INDEX CONCURRENTLY`.
- `User.onboardedAt` backfill: `username ~ '^[a-z0-9_]{3,20}$'` olanlara `createdAt`;
  uymayanlar (e-posta biçimli vb.) ilk girişte onboarding'de yeni kullanıcı adı seçer.
- Büyük tabloda index'ler `CREATE INDEX CONCURRENTLY`, her biri kendi migration dosyasında
  (transaction dışı); mevcut ölçekte kilit riski düşük ama alışkanlık olarak.

**Veri kaybı / geri alınabilirlik:** Tüm M1 migration'ları additive; down script'leri yalnızca
v2'nin yazdığı veriyi (entities, previews, events) siler. `ContentEvent` down'u prod'da
çalıştırılmaz (yasal kayıt) — yalnızca test ortamında.

**Bilinçli olarak yapılmayanlar:** sayaç kolonları (`likeCount` vb. — eski uygulama
güncellemez, coexist'te yanlış olur; M1'de `_count` alt sorgusu yeterli), `PostMention` tablosu
(bildirim + `entities` yeterli; "beni anan gönderiler" sorgusu gelince eklenir), id'leri UUID'ye
çevirme (URL uyumu bozulur, kazanç yok).

### Rollback penceresinde bilinen tutarsızlıklar (kabul edilen riskler)

- v2'de soft-delete (`deletedAt`) edilen içerik eski uygulamada görünür. Moderasyonla kaldırılan
  içerik için de geçerli → rollback'te bu içerikler için hard-delete script'i hazır tutulur.
- v2'nin yazdığı düz metin gönderiler (`$THYAO`) eski uygulamada vurgusuz görünür (link yok).
- Eski uygulamanın rollback sırasında yazdığı gönderiler `contentFormat=1` olarak gelir; v2 okur.

## Karar 4 — Klasör yapısı (`web/`)

```
web/
  package.json  package-lock.json  .nvmrc  next.config.ts  tsconfig.json  eslint.config.mjs
  .prettierrc  prisma.config.ts  vitest.config.ts  playwright.config.ts  firebase.json
  .env.example  docker-compose.test.yml
  prisma/  schema.prisma  migrations/  rollback/  seed.ts
  messages/  tr.json  en.json
  scripts/  pg-local.sh  check-migrations.sh
  src/
    proxy.ts                          # Next 16: i18n + iyimser __session kontrolü
    app/[locale]/
      layout.tsx                      # getCurrentUser() → <Providers initialUser>
      (public)/page.tsx               # landing (girişliyse sunucuda redirect('/akis'))
      (public)/giris/  (public)/kayit/  (public)/gonderi/[id]/  (public)/hisse/[ticker]/ (M2)
      (app)/layout.tsx                # requireUser()
      (app)/akis/  (app)/hos-geldin/  # onboarding
    app/api/
      auth/session/route.ts           # POST oluştur, DELETE çıkış
      feed/route.ts                   # GET sayfa (TanStack Query infinite)
      posts/[id]/comments/route.ts    # GET sayfa
      autocomplete/{stocks,users,tags}/route.ts
      link-preview/route.ts
    features/
      auth/  composer/  posts/  feed/  comments/  stocks/  users/  tags/  link-preview/
        components/  server/{queries.ts,actions.ts,*.test.ts}  schemas.ts  types.ts
    components/ui/                    # shadcn primitive'leri
    lib/
      db/ (client, cursor)  auth/ (session, firebase-admin, firebase-client, csrf)
      entities/ (parse, legacy, normalize, count — saf; server/resolve.ts)
      safe-fetch/ (SSRF korumalı fetch)  rate-limit/  logger/  errors/  env/  request-meta/
    i18n/  (routing, request)
  tests/ e2e/  fixtures/  setup/
```

**`app/api/` kuralının genişletilmesi (coding-standards'tan bilinçli sapma):** Route Handler'lar
(1) webhook/3. parti, (2) `auth/session` (cookie set eden, istemciden `fetch` ile çağrılan uç),
(3) **istemcinin TanStack Query ile okuduğu GET uçları** için kullanılır. Gerekçe: Server
Action'lar POST'tur, istemci başına **sıraya alınır** (autocomplete'te tuş vuruşları birbirini
bekler), HTTP cache/AbortSignal desteği yoktur. Bu GET uçları ince sarmalayıcıdır; yetki ve sorgu
`features/*/server/queries.ts`'teki DAL fonksiyonundadır. **Tüm yazmalar Server Action.**

## Karar 5 — Auth akışı

`auth-session` skill'i aynen uygulanır; burada yalnızca v2'ye özgü somutlaştırmalar:

```
[giris/kayit formu | Google popup]  firebase client SDK (inMemoryPersistence)
   → idToken
   → POST /api/auth/session  { idToken }  + X-CSRF-Token (double-submit) + Origin kontrolü
        verifyIdToken(idToken, checkRevoked=true); auth_time ≤ 5 dk
        createSessionCookie(idToken, 14 gün)  → Set-Cookie __session (HttpOnly; Secure; SameSite=Lax; Path=/)
        DB'de firebaseUserId ile kullanıcı var mı?
          var & onboardedAt != null → { status: 'authenticated', user: PublicUser }
          yok ya da onboardedAt == null → { status: 'needs-onboarding' }
   istemci: signOut() (Firebase istemci oturumu tutulmaz) → router.refresh() ya da next
```

- `getCurrentUser()` (React `cache`, istek başına 1 kez): `verifySessionCookie(cookie, false)`
  (yerel imza + süre; ağ çağrısı yok) → `prisma.user.findUnique({ firebaseUserId })` →
  `decoded.auth_time < user.sessionsValidAfter` ya da `status != active` ise **anonim**.
  Böylece çıkış/ban anında etkili olur ve her istekte Firebase'e ağ çağrısı yapılmaz.
  Hassas işlemler (şifre, hesap silme) ek olarak `checkRevoked=true` + taze `auth_time` ister.
- Dönüş: `{ status: 'authenticated', user: SessionUser } | { status: 'needs-onboarding',
  email } | { status: 'anonymous' }`. `SessionUser` = PublicUser + sahibine özel `email`,
  `emailVerified`, `role`.
- `requireUser()`: anonim → `redirect('/giris?next=...')`; needs-onboarding →
  `redirect('/hos-geldin')`. Onboarding'i tamamlamamış kullanıcı için **DB'de placeholder
  kullanıcı adı üretilmez**; DB satırı onboarding Server Action'ında oluşturulur
  (`completeOnboarding({ username, noticeAccepted, ageConfirmed, marketingOptIn })`).
- Eski hesaplar: aynı Firebase projesi → mevcut kullanıcılar şifresi/Google'ıyla girer,
  `firebaseUserId` ile eşleşir. Kullanıcı adı kurala uymayanlar onboarding'e düşer.
- E-posta doğrulama: kaynak Firebase. Session oluştururken `email_verified` DB'ye yazılır.
  Doğrulanmamış kullanıcı yazma denediğinde sunucu bir kez `admin.getUser(uid)` ile tazeler
  (yalnızca bu durumda ağ çağrısı), hâlâ değilse `EMAIL_NOT_VERIFIED`.
- Çıkış: `DELETE /api/auth/session` → `sessionsValidAfter = now()` + `revokeRefreshTokens` +
  cookie `Max-Age=0`. Bu skill gereği **tüm cihazlardan** çıkış demektir (karar gerekli K8,
  aşağıda).
- Oturum ömrü en fazla 14 gün (Firebase session cookie üst sınırı); sessiz yenileme yok
  (auth_time ≤ 5 dk kuralı yüzünden yenileme yeniden giriş ister).
- Google girişi `signInWithPopup` (redirect akışı üçüncü taraf depolama bölümlemesi yüzünden
  güvenilmez). v2 alan adları Firebase *Authorized domains*'e eklenir.
- Emulator güvenliği: `FIREBASE_AUTH_EMULATOR_HOST` set ve `VERCEL_ENV === 'production'` ise
  `lib/auth/firebase-admin.ts` başlangıçta hata fırlatır (emulator token'ları imzasızdır).

## Alternatifler (özet)

- Yeni repo / uzun ömürlü branch / monorepo araçları → Karar 1 tablosu.
- Yeni DB + ETL → reddedildi (Karar 3).
- `@prisma/adapter-neon` → reddedildi (test paritesi).
- Upstash Redis ile rate limit → mevcut ölçekte gereksiz yeni sağlayıcı + yurt dışı aktarım
  muhatabı; Postgres `RateLimitBucket` yeterli. Autocomplete gibi yüksek frekanslı GET'lerde
  ek olarak Vercel Firewall rate limit kuralı.
- TypeScript 7 → typescript-eslint uyumsuz (yukarıda).

## Sonuçlar

- (+) Prod v2 geliştirilirken etkilenmez; cutover ve rollback alan adı taşımaktan ibaret.
- (+) Veri taşıma yok; eski içerik `contentFormat=1` ile okunur.
- (−) Kök depoda 3 küçük koruma değişikliği şart; unutulursa prod build'i kırılır → S0 dilimi
  ilk sırada ve CI'da "kök tsconfig `web`'i dışlıyor mu" kontrolü.
- (−) Cutover'da tüm kullanıcılar bir kez yeniden giriş yapar.
- (−) Rollback penceresinde soft-delete tutarsızlığı (yukarıda).

## Karar gerekli (kullanıcı)

| # | Konu | Öneri |
|---|------|-------|
| K1 | v2'nin yeri | Aynı repo, `web/` dizini, ikinci Vercel projesi |
| K2 | Cutover'da DB | Aynı prod Neon DB, expand/contract; uzun süreli çift yazma yok |
| K2b | Staging prod verisinin kopyası mı? | Hayır (M1'de gerek yok); gerekirse legal L6 onayıyla, sadece ekip erişimli |
| K3 | Cutover'da herkesin bir kez yeniden girişi | Kabul (duyuru banner'ı ile) |
| K7 | URL yapısı | Türkçe yollar (`/akis`, `/gonderi/:id`, `/u/:kullanici`, `/hisse/:kod`, `/etiket/:slug`), `en` öneki `/en`, eski URL'ler 301 |
| K8 | Çıkış = tüm cihazlardan çıkış (skill gereği) | Kabul; cihaz bazlı çıkış istenirse `Session` tablosu gerekir (M2+) |
| K9 | Preview için ayrı Firebase projesi (`borsaliyorum-dev`) | Evet (ücretsiz, test hesapları prod'u kirletmez) |

## Hukuki sorular (legal-advisor'a)

- **L1** Veri lokasyonu: Neon bölgesi (muhtemelen AWS `eu-central-1`), Vercel `fra1`, Firebase
  Auth (ABD). v2 yeni ülke eklemiyor; mevcut yurt dışı aktarım dayanağı (KVKK m.9, standart
  sözleşme + Kurul'a bildirim) yerinde mi?
- **L2** 5651: `ContentEvent`'te IP + zaman + kullanıcı + işlem yeterli mi; **kaynak port**
  gerekli mi (Vercel arkasında port alınamayabilir); saklama süresi alt/üst sınırı?
- **L3** Kayıtta saklanacak onay alanları (`noticeVersion`, `ageConfirmedAt`, `marketingOptInAt`)
  yeterli/gerekli mi? Mevcut `birthday` kolonu: v2 toplamayı bırakıyor; mevcut verinin silinmesi
  gerekir mi?
- **L4** Kullanıcı adı = e-posta olan eski hesaplar şu an prod'da e-postayı herkese açık
  gösteriyor (audit H). v2'yi beklemeden prod'da düzeltilmeli mi (öneri: evet, ayrı hotfix)?
- **L6** Prod verisinin Neon branch kopyasının staging'de kullanımı.

## Prod için acil not (v2'den bağımsız)

Eski kodda iki **SSRF** açığı var: `src/app/api/image-proxy/route.ts` (doğrulamasız
`fetch(imageUrl)`, auth yok → açık proxy) ve `src/app/api/content/get-preview/route.ts`
(doğrulamasız `fetch(url)`). İkisi de Vercel fonksiyonundan iç/metadata adreslerine istek
attırabilir. `security-reviewer`'a ayrı hotfix olarak verilmesi önerilir.
