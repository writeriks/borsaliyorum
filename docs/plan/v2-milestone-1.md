# v2 Milestone-1: iskelet, tasarım token'ları, auth, composer/entity, akış, gönderi detayı

- Tarih: 2026-10-10 · Branch tabanı: `claude/v2-foundation`
- Dayanak: ADR-0001 (temel), ADR-0002 (composer/entity), ADR-0003 (test),
  `docs/design/v2-design-system.md`, `docs/design/v2-composer-and-entities.md`, `docs/legal/composer-metinleri.md`
- Her dilim **tek PR**, `pre-merge-gate`'ten geçer. Kabul kriterlerine ek olarak her dilimde
  "bitti tanımı" (coding-standards) geçerlidir: type-check/lint/test temiz, metinler `tr`+`en`,
  loading/empty/error durumları, gerekiyorsa security/legal notu.

## Kapsam

**Dahil:** `web/` iskeleti, tasarım token'ları ve uygulama kabuğu, Firebase session cookie auth
(kayıt, giriş, Google, onboarding, çıkış), entity parser, composer (autocomplete + zengin
vurgu + link önizleme), gönderi/yorum oluşturma, akış (takip + son gönderiler), gönderi
detayı (yorumlar, beğeni, kendi içeriğini silme), 5651 içerik olay kaydı, CI.

**Kapsam dışı (M2+):** görsel/medya yükleme (eski `mediaUrl`'ler sadece gösterilir), repost,
bildirim sayfası (bildirim kayıtları yazılır, listelenmez), profil/hisse/etiket sayfaları
(linkler var; sayfalar M2 — M1'de basit placeholder `notFound` değil "yakında" sayfası),
arama, şikâyet/moderasyon paneli (öncelikli, M2'nin ilk işi), premium, gönderi düzenleme,
önizleme görseli, GIF (sağlayıcı ve KVKK kararı açık, legal "Hukuki değerlendirme 3"), cutover.

> **Tasarımla kapsam farkı (karar gerekli K10):** `docs/design/v2-composer-and-entities.md`
> §1.4 composer'a görsel + GIF ekleme koyuyor. Bu plan M1'de **görsel yüklemeyi dışarıda
> bırakıyor** (sunucuda MIME/boyut/piksel doğrulama, EXIF silme, Storage kuralları ve
> security review ayrı bir dilim; GIF sağlayıcısı henüz seçilmedi). Öneri: composer toolbar'ında
> görsel/GIF butonları M1'de gösterilmez; görsel yükleme M2'nin ilk dilimlerinden biri
> (`S14`), GIF sağlayıcı kararı sonrası. Kullanıcı M1'de görsel isterse S14 S10'dan sonra
> paralel eklenir (+~1 dilim).

## Teknik notlar: akış ve detay

**Akış sorgusu** (`features/feed/server/queries.ts`, `getHomeFeedPage(viewer, cursor)`):
görüntüleyenin takip ettiği kullanıcılar + kendisi **veya** takip ettiği hisseleri içeren
gönderiler; `deletedAt IS NULL`; iki yönlü engelleme hariç; `(createdAt, postId) < cursor`
sırasıyla 20'şer. Tek sorgu + aynı sorguda `user` (PublicUser alanları), `linkPreview`,
`_count { likedBy, comments }`, görüntüleyenin beğenisi (`likedBy where userId = viewer`,
`take: 1`); ardından sayfadaki mention `userId`'leri ve eski format gönderilerin kullanıcı
adları için **tek** batch sorgu → sayfa başına sabit 2 sorgu (N+1 yok).
Takip ettiği kimse/hisse yoksa boş durum + "Son gönderiler" sekmesine yönlendirme.
`getLatestPage(viewer | null, cursor)`: global, anonim de görür (landing).
Ölçek notu: `OR (userId IN …) OR EXISTS (_PostStocks …)` mevcut ölçekte yeterli; p95 > 200 ms
olursa iki index'li alt sorgunun `UNION`'ına geçilir (sorgu planı S11'de `EXPLAIN` ile
kaydedilir).

**Cursor:** `base64url("<ISO createdAt>|<postId>")`, Zod ile parse; bozuk cursor → ilk sayfa
değil `VALIDATION` (400).

**İstemci:** ilk sayfa Server Component'te render edilir ve `initialData` olarak
`useInfiniteQuery`'ye verilir; sonraki sayfalar `GET /api/feed?tab=home|latest&cursor=`.
Yeni gönderi sonrası `router.refresh()` + query invalidation. Beğeni optimistic, hata → geri
al + toast.

**Detay** (`/gonderi/[id]`, public): `getPostById(viewer | null, id)` — silinmiş/yok → `notFound()`;
görüntüleyen yazarı engellemişse ya da yazar görüntüleyeni engellemişse "Bu içerik
görüntülenemiyor" durumu (ayrı bileşen, 200). `generateMetadata` başlık/açıklama düz metinden
(ilk 160 karakter, entity'ler metin olarak), `robots` prod dışında noindex. Yorumlar cursor ile
artan sırada 20'şer. Anonim kullanıcıya composer yerine giriş çağrısı (auth durumu sunucudan
geldiği için flash yok).

## Dilimler

Gösterim: **Bağımlılık** satırı yalnızca *zorunlu* önkoşulları listeler. "Sözleşme" = başka
dilimin tamamlanması gerekmez, arayüz (tip/endpoint şekli) bu planda sabitlendi, mock ile
başlanabilir.

### S0 — Prod koruma (kök) · küçük
- Kök `tsconfig.json` `exclude`'a `web`; `get-latest` script'inden `db push` kaldırılır;
  eski Vercel projesine Ignored Build Step (kullanıcı/ops panelden yapar, komut ADR-0001'de).
- **Bağımlılık:** yok. **`web/` kodu `main`'e girmeden önce merge edilmeli.**
- **Kabul:** kökte `npm run type-check` ve `npm run build` `web/` içinde geçersiz bir `.ts`
  dosyası varken bile geçer (manuel deneme PR açıklamasında); `get-latest` `db push` içermez;
  Vercel ayarının yapıldığı kullanıcı tarafından teyit edildi.

### S1 — `web/` iskeleti + kalite araçları + CI
- Next 16.4 / React 19.3 / TS 6.0.3 (`strict`, `noUncheckedIndexedAccess`), ESLint 9 flat
  (`react/no-danger: error`, import sınırı kuralı: `features/A` → `features/B/server` yasak),
  Prettier, Tailwind 4 kurulumu (token'sız), next-intl 4 (`tr` varsayılan, `as-needed`,
  `messages/{tr,en}.json`), `lib/env.ts` (Zod ile env doğrulama; eksik env build'i kırar),
  `lib/logger` (JSON, e-posta/IP maskeleme), `lib/errors` (`ErrorCode` + `Result<T>`),
  `proxy.ts` (yalnızca i18n), Vitest 5 (`unit`, `dom`, `integration`, `browser` projeleri) + Playwright iskeleti, `pg-local.sh`,
  `docker-compose.test.yml`, `v2-ci.yml` (5 job), `.nvmrc`, `.env.example`.
- **Bağımlılık:** yok (S0 ile paralel; S0'dan önce `main`'e merge edilmez).
- **Kabul:** `npm ci && npm run type-check && npm run lint && npm run test:unit && npm run build`
  temiz; `/` ve `/en` i18n'li boş sayfa render eder; bir Playwright smoke testi hem yerelde
  (`PW_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`) hem CI'da geçer; Vercel v2 projesinde
  preview deploy çalışır ve `X-Robots-Tag: noindex` döner; `root-guard` job'u yeşil.
- **Uygulama notu (2026-10-10):** K1 (v2 ayrı dizin değil, repo kökünde; aktif kullanıcı yok)
  nedeniyle S0 ve `root-guard` job'u düştü; `web/` yerine kök, `v2-ci.yml` yerine `ci.yml`.
  `pg-local.sh` ve `docker-compose.test.yml` test DB altyapısıyla birlikte S3'e taşındı.
  `X-Robots-Tag: noindex` `next.config.ts`'te `VERCEL_ENV !== 'production'` için verilir.

### S2 — Tasarım token'ları + uygulama kabuğu + durum bileşenleri
- ui-ux-designer'ın token'ları Tailwind 4 `@theme` + CSS değişkenleri (koyu varsayılan, açık
  eşdeğer), `next/font` ile Türkçe destekli font, shadcn primitive'leri (Button, Input, Dialog,
  Tooltip, HoverCard, Tabs, Toast/sonner, Skeleton, Avatar), `AppShell` (mobil üst bar + alt tab
  bar, masaüstü sol nav + orta kolon + sağ kolon yer tutucusu), `EmptyState`, `ErrorState`,
  `InvestmentDisclaimer` (metin legal'den), tema geçişi (`next-themes`, flash'sız).
- **Bağımlılık:** S1. Tasarım token'ları ui-ux-designer'dan (gelene kadar geçici değerlerle
  başlanabilir; token **isimleri** design-system skill'inde sabit).
- **Kabul:** her token iki temada tanımlı, `--up`/`--down`/gövde metni WCAG AA kontrastı
  (otomatik test: token çiftleri için kontrast hesabı unit testi); dokunma hedefleri ≥ 44px;
  axe ile kabuk sayfasında serious/critical yok; tema yenilemede flash yok (E2E).

### S3 — Veri katmanı: Prisma 7 eşlemesi, baseline, M1 migration'ları, test DB altyapısı
- `web/prisma/schema.prisma`: mevcut tablolar `@@map`/`@map` ile; `prisma.config.ts`
  (CLI doğrudan URL, runtime pooled), `lib/db` (`@prisma/adapter-pg`, havuz ayarları,
  `attachDatabasePool`). Prod'a **salt-okunur** rolle drift raporu (`migrate diff`) → baseline
  stratejisi (ADR-0001). Neon bölgesi ve PG sürümü teyit edilip ADR-0001/0003'e işlenir.
- M1 migration'ları (ADR-0001 diff'i): User/Post/Comment/Tag kolonları, `LinkPreview`,
  `ContentEvent` (+ append-only trigger), `RateLimitBucket`, index'ler (`CONCURRENTLY`, ayrı
  dosyalar), `lower(username) text_pattern_ops`, `Tag.slug` backfill + tekilleştirme + unique,
  `User.onboardedAt` backfill. Her biri için `rollback/*.down.sql`.
- Test altyapısı: template DB + worker DB'leri, `factories.ts`, `db:migrations:check`
  (eski uygulama INSERT uyumluluğu dahil), sentetik `seed.ts` (hisseler `scripts/`'teki KAP
  CSV formatından, kullanıcılar sahte).
- **Bağımlılık:** S1.
- **Kabul:** `db:migrations:check` yeşil (up → diff boş → down → up; eski INSERT'ler geçer;
  yıkıcı ifade yok); drift raporu PR açıklamasında; `ContentEvent` üzerinde UPDATE/DELETE
  hata verir (integration test); `Tag.slug` backfill'i `BIST100`/`bist100`/`BİST100`'ü tek
  tag'e birleştirir ve `_PostTags` satırları kaybolmaz (test); **prod'a migration uygulanmaz**.
  `architect` migration review'u (pre-merge-gate tablosu gereği).

### S4 — Entity parser (`lib/entities`)
- ADR-0002 Karar 2'deki tüm fonksiyonlar, saf TS, bağımlılıksız; `fromLegacyMarkup`;
  `findActiveTrigger` (composer'ın tetikleme kuralı).
- **Bağımlılık:** yok (S1'in Vitest kurulumu gelene kadar dilim kendi geçici `vitest`
  ayarıyla çalışabilir; ilk gün başlar).
- **Kabul:** ADR-0002 kabul tablosunun tamamı test olarak; `fast-check` özellikleri (sıralı,
  çakışmasız, throw etmez, `normalizeContent` idempotent); `toTicker('sise') === 'SISE'`;
  `foldTag('BİST100') === 'bist100'`; bidi override'lı girdi temizlenir; satır+dal kapsamı
  ≥ %95; istemci bundle'ında Node API'si kullanmaz (lint kuralı / import testi).

### S5 — Auth: session cookie, onboarding, giriş/kayıt/çıkış
- `lib/auth/{firebase-admin,firebase-client,session,csrf}.ts`; `POST|DELETE /api/auth/session`
  (Origin + double-submit CSRF, `auth_time ≤ 5 dk`), `getCurrentUser` (React `cache`,
  `sessionsValidAfter`/`status` kontrolü), `requireUser`, `proxy.ts`'e iyimser cookie
  kontrolü, `AuthProvider`/`useAuth` (tek provider, abonelik yok), `(app)` ve `(public)`
  layout guard'ları, sayfalar: `/giris`, `/kayit`, `/hos-geldin` (onboarding: kullanıcı adı
  kuralı + rezerve liste + müsaitlik kontrolü, aydınlatma linki, 18+ beyanı, işaretsiz
  pazarlama onayı), e-posta doğrulama durumu ve yeniden gönderme, Firebase hata kodu → i18n
  eşlemesi, emulator bağlantısı ve prod koruması.
- **Bağımlılık:** S1, S3 (User kolonları). S2 olmadan geçici stille başlanabilir; UI son hali
  S2 sonrası.
- **Kabul:** ADR-0003'teki `auth.*.spec.ts` beş senaryonun tamamı yeşil (flash yok, 14 günlük
  cookie, kayıt→doğrulama→onboarding, hatalı giriş mesajı alan belirtmez, çıkış + döngüsüz
  yönlendirme); integration: `completeOnboarding` rezerve/kurala uymayan/alınmış kullanıcı adını
  reddeder; e-posta biçimli eski kullanıcı adına sahip seed kullanıcısı girişte onboarding'e
  düşer; `getCurrentUser` dönüşünde e-posta/firebaseUid yalnızca sahibine; emulator env'i
  prod'da set ise başlangıç hatası (unit). **security-reviewer + legal-advisor zorunlu.**

### S6 — `RichText` render + gönderi kartı (salt okunur)
- `RichText` (Server Component, ADR-0002 Karar 5), `PostCard` (yazar, göreli zaman + tam
  tarih tooltip, sentiment etiketi (yalnızca bullish/bearish), "Reklam / İşbirliği" etiketi
  (`isSponsored`, DOM'da yazar adından önce, kısaltılmış gövdede de görünür), `RichText`,
  eski `mediaUrl` görseli sabit oranlı kutuda,
  `LinkPreviewCard` metin kartı, beğeni/yorum sayısı alanları — etkileşim S11'de),
  cashtag hover kartı (şirket adı + uyarı metni), eski format (`contentFormat=1`) içerik desteği.
- **Bağımlılık:** S4, S2. (Veri: S3'ün tipleri; fixture ile test edilir.)
- **Kabul:** `dom` testleri: script/HTML içeren metin escape edilir; `javascript:` ve
  `data:` href'leri link olmaz; uyumsuz offset'li entity atlanır ve render throw etmez;
  `$(THYAO)` eski markup'ı `$THYAO` linki olarak görünür; URL `rel="nofollow ugc noopener
  noreferrer"`; projede `dangerouslySetInnerHTML` yok (lint); sponsorlu kartta etiket yazar
  adından önce (`[LEG-03]`).

### S7 — Autocomplete uçları
- `GET /api/autocomplete/stocks` (cache'li tam indeks), `/users?q=`, `/tags?q=`; DAL
  fonksiyonları sıralama kurallarıyla (ADR-0002 Karar 4); engelleme ve `status` filtreleri;
  bellek içi rate limit; `stocks` cache tag'inin invalidation'ı (stock sync sonrası çağrılacak
  bir revalidate yolu: `POST /api/revalidate/stocks`, paylaşılan secret ile — sync workflow'una
  adım eklenir).
- **Bağımlılık:** S3, S5 (`requireUser` users/tags için). Sözleşme ADR-0002'de → S8 paralel
  başlayabilir.
- **Kabul:** integration: sıralama (tam eşleşme > takip edilen > önek), iki yönlü engelleme
  hariç, askıdaki kullanıcı hariç, DTO'da e-posta yok, `q` doğrulaması; anonim kullanıcı
  users/tags'te 401; stocks yanıtı `Cache-Control` taşır; `EXPLAIN` önek index'ini kullanıyor
  (test ya da PR'da plan çıktısı).
- **Uygulama notu (2026-10-10):** `features/autocomplete` (DAL `server/queries.ts`, çekirdek
  `server/route-handlers.ts`), uçlar `app/api/autocomplete/*`. Başarılı gövde composer istemci
  şemasının birebir biçimi (dizi / `{ source, tickers }`), hata gövdesi `{ ok: false, error }`.
  Önek sorguları `LIKE` yerine bayt aralığı (`~>=~`/`~<~`): parametreli planda da
  `User_username_lower_pattern_idx` ve yeni `Tag_slug_pattern_idx` (`(slug::text)
  text_pattern_ops`, ifade index'i) kullanılır. Rate limit bellek içi (`lib/rate-limit/memory`):
  girişli uçlar kullanıcı başına 60/dk ortak, hisse indeksi IP-HMAC başına 30/dk. Etiket sıralaması:
  tam eşleşme > 30 günlük kullanım > `updatedAt`; boş sorgu 24 saatin trendi (10 dk önbellek).
  Kullanıcı önerisinde görüntüleyenin kendisi, onboarding'i bitmemiş ve rezerve adlı hesaplar da
  hariç; görünen ad kelime başı araması (`fold_tag`, index'siz) yalnızca 2+ karakterde.
  `POST /api/revalidate/stocks` (`STOCKS_REVALIDATE_SECRET`, tanımsızsa 404) Next önbelleğini ve
  Vercel CDN tag'ini (`stocks`) geçersiz kılar; sync workflow'u `--apply` sonrası çağırır.
  Composer istemcisinin link önizleme şeması S9'un gerçek gövdesine (`Result<{ preview }>`)
  uyarlandı.

### S8 — Composer (TipTap)
- `features/composer`: `Composer` (lazy, skeleton), `EntityDecorations` eklentisi,
  üç `Suggestion` (tetikleme `findActiveTrigger` ile), popup (`@floating-ui/dom`, ARIA
  combobox/listbox), grafem sayacı, sentiment seçici (yalnızca tanınmış cashtag varken),
  sponsorluk anahtarı (cashtag ile birlikte paylaşımı engeller), kısa yatırım uyarısı,
  boş sorgu varsayılan önerileri, düz metin yapıştırma, `localStorage` taslak (çıkışta silinir:
  `AuthProvider` başarılı çıkışta `window`'a `SIGNED_OUT_EVENT` = `'borsaliyorum:signed-out'`
  yayınlar (`components/auth/auth-provider.tsx`, unit testli); composer bunu dinleyip taslağı
  siler. Oturum süresi dolması çıkış değildir: o durumda olay yayınlanmaz, taslak korunur),
  `clientRequestId` ile tek gönderim, link önizleme alanı (S9 uç sözleşmesiyle), `mode: 'post' | 'comment'`,
  `onSubmit` dışarıdan (S10 action'ları bağlanır). Hisse indeksi istemcide TanStack Query.
- **Bağımlılık:** S4, S2. S7 ve S9 için sözleşme + MSW mock'u yeterli; gerçek bağlantı
  S7/S9 bitince.
- **Kabul:** tasarım spec'indeki composer kabul kriterleri (`CNT-*`, `SEN-*`, `LEG-*`, `SND-*`,
  autocomplete bölümü; medya `MED-*` K10'a bağlı) `browser` projesinde ya da E2E'de test
  olarak; ek olarak: her tetikleyici için öneri + klavye ile seçim + Esc; IME
  composition sırasında popup açık kalır ama tuşlar yakalanmaz (`[AC-24]`, Gboard); HTML yapıştırma düz metin olur; 1000 sınırı ve
  aşım işareti; bilinmeyen cashtag işareti; ekran okuyucu öznitelikleri (`aria-activedescendant`
  vb.) doğru; composer chunk'ı hedef ≤ 100 KB gz (`npm run size:check`, CI build job'unda; ölçülen 102,5 KB, CI bütçesi 104 KB — kalan fark ADR-0002 Karar 3 kararına bağlı); mobil
  (Pixel 7 emülasyonu) dokunma ile seçim. **ui-ux-designer hızlı review.**
- **Uygulama notu (2026-10-10):** Sözleşme `src/features/composer/types.ts` + `schemas.ts`'te;
  S7/S9 buna uymalı ya da S8 istemcisi (`services/http.ts`) güncellenmeli. ADR-0002'ye ekler:
  `StockIndexItem.m` (7 günlük gönderi sayısı, eşitlik bozucu), `UserSuggestion.following`
  ("Takip ediyorsun"), `GET /api/autocomplete/stocks/default` → `{ source, tickers }`,
  `GET /api/link-preview` → `{ status: 'ok', url, host, siteName, title, description } |
  { status: 'none' }`; `CommentSubmitInput.clientRequestId` (Karar 7'de yorumda yok).
  MSW yerine Playwright route mock'ları; önizleme `/dev/composer` (yalnızca development ve
  `ENABLE_DEV_PAGES=1`'li E2E build'i, Vercel production'da 404). Editörde `aria-expanded`
  yok: ARIA 1.2'de `textbox` rolünde geçersiz (axe `aria-allowed-attr`); açık liste
  `aria-controls` + `aria-activedescendant` ile bildirilir. Yorum sınırı istemcide 500.

### S9 — Link önizleme servisi (SSRF korumalı)
- `lib/safe-fetch` (ADR-0002 Karar 6 kuralları, `undici` 8 + `ipaddr.js` 2.5), HTML meta
  çıkarımı (`htmlparser2` 12), `features/link-preview/server` (cache'li `getOrFetchPreview`),
  `GET /api/link-preview?url=` (girişli, 20/dk), `LinkPreviewCard` metin kartı.
- **Bağımlılık:** S3 (`LinkPreview` tablosu). S1'den sonra herhangi bir zamanda; S5'in
  `requireUser`'ı yalnızca route bağlanırken gerekir.
- **Kabul:** unit: tüm özel/rezerve IPv4/IPv6 aralıkları, IPv4-mapped IPv6, IP literal,
  kullanıcı bilgili URL, 80/443 dışı port, 4. yönlendirme, private IP'ye yönlendirme, DNS
  rebinding (lookup ikinci çağrıda private döner) → `blocked`; 512 KB'ı aşan gövde kesilir;
  3 sn zaman aşımı; `text/html` dışı reddedilir; meta değerleri kırpılır ve kontrol karakterleri
  temizlenir; aynı URL ikinci kez fetch edilmez (cache); prod'da `SAFE_FETCH_TEST_ALLOW`
  set ise başlangıç hatası. **security-reviewer zorunlu.**
- **Not (S9 review sonrası):** `getOrFetchPreview` `src/lib/link-preview/get-or-fetch-preview.ts`
  altındadır (DTO tipi `src/lib/link-preview/types.ts`); S10'da `features/posts` doğrudan buradan
  import eder. `features/link-preview`'da yalnızca route-handler ve `LinkPreviewCard` kalır.
  Kayıtlı alan adını (eTLD+1, `tldts`) değiştiren yönlendirmeler önizlenmez (`blocked`);
  `lib/rate-limit` `$transaction` istemcisini kabul eder.

### S10 — Gönderi/yorum yazma, beğeni, silme (Server Actions)
- `createPost`, `deletePost`, `setPostLike`, `createComment`, `deleteComment`,
  `setCommentLike` (ADR-0002 Karar 7), `lib/rate-limit` (Postgres bucket), `lib/request-meta`
  (IP/UA/requestId — `x-real-ip`/`x-forwarded-for`), `ContentEvent` yazımı, mention
  bildirimleri, `after()` ile önizleme bağlama, `revalidatePath`.
- **Bağımlılık:** S3, S4, S5. (S9 olmadan önizleme bağlama adımı no-op ile başlar.)
- **Kabul:** integration: anonim → `UNAUTHENTICATED`; doğrulanmamış → `EMAIL_NOT_VERIFIED`;
  onboarding'siz → `ONBOARDING_REQUIRED`; askıda → `ACCOUNT_SUSPENDED`; cashtag'siz gönderi
  kabul edilir ve sentiment `neutral`'a zorlanır (K4); sponsorlu + cashtag →
  `SPONSORED_CASHTAG_BLOCKED`; aynı `clientRequestId` ile ikinci çağrı yeni gönderi oluşturmaz
  ve ilk `postId`'yi döner; bilinmeyen cashtag → `UNKNOWN_CASHTAG` + `meta.tickers`;
  yorumda cashtag kabul edilir (eski hata #6'nın regresyonu); 11 mention → `TOO_MANY_ENTITIES`;
  rate limit aşımı → `RATE_LIMITED` + `retryAfter`; kendine mention bildirim üretmez; seni
  engellemiş kullanıcıya bildirim gitmez; `entities` ile `_PostStocks`/`_PostTags` tutarlı;
  her başarılı yazmada tek `ContentEvent` (IP dahil); başkasının gönderisini silme `FORBIDDEN`,
  moderator silebilir; silme soft (`deletedAt`) ve `ContentEvent('post.delete')`; beğeni
  idempotent (iki kez `liked:true` tek satır); metin sınırı `CONTENT_MAX_CHARS`'tan
  (`src/lib/content-limits.ts`: gönderi 1000, yorum 500 — K11; şema sayıyı tekrar yazmaz,
  1001/501 grafem → `CONTENT_TOO_LONG`); `Comment.clientRequestId` migration'ı + aynı kimlikle
  ikinci `createComment` ilk `commentId`'yi döner (ADR-0002 Karar 7); **her yazma action'ı
  `requireWriter()` (`lib/auth/session.ts`) kullanır** — `requireActionUser` + gerekirse
  Firebase'den bir kez e-posta doğrulama tazelemesi → `EMAIL_NOT_VERIFIED` (kendi kontrolünü
  yazan action yok); istemci sonuçları ortak `useActionResult` (`lib/client/action-result.ts`)
  ile işler (`UNAUTHENTICATED` → "Oturumun sona erdi" + `/giris?next=`, taslak korunur).
  **security-reviewer + legal-advisor (5651 kaydı) zorunlu.**

### S11 — Akış sayfası
- `/akis` (girişli: "Takip" ve "Son" sekmeleri), landing'de (`/`) anonim için "Son" akışı +
  kayıt çağrısı, `getHomeFeedPage`/`getLatestPage`, `GET /api/feed`, `useInfiniteQuery`
  (SSR ilk sayfa), üstte composer (S8) + `createPost` bağlantısı, optimistic beğeni, boş/hata/
  yükleniyor durumları, yatırım tavsiyesi uyarısı yerleşimi.
- **Bağımlılık:** S6, S8, S10 (S5 dolaylı).
- **Kabul:** integration: takip edilen kullanıcı + takip edilen hisse gönderileri gelir,
  diğerleri gelmez; engellenen (iki yön) ve silinmiş gelmez; cursor sınırında tekrar/atlama yok
  (aynı `createdAt`'li gönderilerle test); sayfa başına sorgu sayısı ≤ 3 (Prisma query log
  sayacıyla test); E2E `post.create.spec.ts` yeşil; sonsuz kaydırmada CLS < 0.1 (Playwright
  ile `PerformanceObserver` ölçümü); boş akış durumu "Son" sekmesine yönlendirir.

### S12 — Gönderi detayı + yorumlar
- `/gonderi/[id]` (public), `getPostById`, `getCommentsPage`, `GET /api/posts/[id]/comments`,
  yorum composer'ı (S8 `mode: 'comment'`), beğeni/silme, engelleme durumu bileşeni,
  `generateMetadata`, eski URL'den (`/tr/posts/:id`) 301 (cutover'da etkinleşecek
  `redirects` listesi, M1'de test edilir).
- **Bağımlılık:** S6, S8, S10. S11 ile **paralel** (ortak `PostCard` S6'da).
- **Kabul:** E2E `post.detail.spec.ts` yeşil; integration: silinmiş → `notFound`, engelleme →
  "görüntülenemiyor", anonim okuma serbest ama yazma `UNAUTHENTICATED`; yorum sayfalama
  cursor'lı; metadata'da HTML/entity sızıntısı yok; eski URL yönlendirmeleri unit testli.

### S13 — Uçtan uca sertleştirme
- `a11y.spec.ts`, mobil proje koşusu, `auth.*` + akış + detay senaryolarının birlikte
  koşusu, performans bütçesi (akış LCP, composer chunk), iOS Safari manuel kontrol listesi,
  M1 kapanış raporu (açık riskler, M2 girdileri).
- **Bağımlılık:** S11, S12.
- **Kabul:** `npm run test:e2e` tüm projelerde yeşil; axe serious/critical 0; Lighthouse
  (lab) akış sayfası performans ≥ 90 mobil; açık legal soruların durumu raporda.

## Paralellik

```
Dalga 0 (hemen):     S0 ─┐   S1 ───────────────┐   S4 (saf TS, ilk gün)
                         │                      │
Dalga 1 (S1 sonrası):    │   S2      S3 ────────┼─────────┐
                         │                      │         │
Dalga 2:                 │   S5 (S3) S6 (S2,S4) S9 (S3)   S8 (S2,S4; S7/S9 mock'lu)
                         │
Dalga 3:                     S7 (S3,S5)   S10 (S3,S4,S5)
Dalga 4:                     S11 (S6,S8,S10)  ║  S12 (S6,S8,S10)   ← paralel
Dalga 5:                     S13
```

- Aynı anda en fazla 3-4 `fullstack-engineer` (ayrı worktree'ler) mantıklı: dalga 1'de S2+S3
  (+ S4 sürüyorsa), dalga 2'de S5+S6+S8+S9.
- Çakışma noktaları: `messages/*.json` (her dilim kendi namespace'i: `auth.*`, `composer.*`,
  `feed.*`...), `prisma/schema.prisma` (yalnızca S3 değiştirir; sonraki şema ihtiyacı S3'e
  ek PR), `components/ui` (yalnızca S2 ekler).
- Kritik yol: S1 → S3 → S5 → S10 → S11/S12 → S13.

## Karar gerekli (kullanıcı) — özet

ADR-0001: K1 (repo yeri), K2/K2b (DB ve staging verisi), K3 (cutover'da yeniden giriş),
K7 (URL yapısı), K8 (çıkış = tüm cihazlar), K9 (ayrı dev Firebase projesi).
ADR-0002: K4 (gönderide zorunlu cashtag — öneri: kaldır), K5 (bilinmeyen cashtag reddi),
K6 (önizleme görseli). Plan: K10 (M1'de görsel/GIF yükleme yok).
Ops: eski Vercel projesine Ignored Build Step (S0), GitHub branch protection (S1), Neon rolleri
`app_rw`/`migrator` (öneri).

## Varsayımlar

- Prod DB Neon üzerinde ve tek DB; Neon bölgesi/PG sürümü S3'te teyit edilecek.
- Eski uygulama ile v2 aynı Firebase projesini kullanıyor (kullanıcılar taşınmaz).
- Hisse listesi `Stock` tablosunda güncel (haftalık sync); v2 `src/tickers.ts`'i kullanmaz.
- ui-ux-designer token isimlerini design-system skill'indekiyle uyumlu teslim eder; görsel
  değerler değişebilir, isimler değişmez.
- M1'de yeni üçüncü taraf veri işleyen eklenmiyor (Vercel/Neon/Firebase mevcut); link önizleme
  dış sitelere yalnızca sunucudan, kişisel veri göndermeden istek atar.
