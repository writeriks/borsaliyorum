# ADR-0002: Composer (gönderi/yorum editörü) ve entity parsing

- Tarih: 2026-10-10
- Durum: **Önerildi**
- İlgili: ADR-0001 (veri modeli: `contentFormat`, `entities`, `LinkPreview`), ADR-0003 (test),
  `docs/design/v2-composer-and-entities.md` (UX, kabul kriterleri), `docs/legal/composer-metinleri.md`

## Bağlam

Eski çözüm (`src/components/content-input/`, `src/components/content/`,
`src/services/tag-service/`, `src/hooks/useHighlightUrls.tsx`) incelendi. Sorunlar:

| # | Sorun | Yer |
|---|-------|-----|
| 1 | Saklama formatı react-mentions markup'ı (`$(THYAO)`); format editör kütüphanesine kilitli, arama/SEO/dışa aktarım için kirli | `content-input.tsx` `markup=` |
| 2 | Üç ayrı ayrıştırma: editör (react-mentions), render (`content.tsx` regex), sunucu (`tag-service.ts` regex) — kurallar birbirinden habersiz | |
| 3 | URL vurgusu `innerHTML` ile, kullanıcı metni escape edilmeden yazılıyor (self-XSS) | `useHighlightUrls.tsx:22` |
| 4 | Link önizleme: doğrulamasız `fetch(url)` → **SSRF**; her gönderi render'ında istemciden ayrı istek; jsdom ile parse | `api/content/get-preview/route.ts` |
| 5 | Hashtag autocomplete yok (yazılanı öneriyor), mention araması her tuşta tam liste kopyası, cashtag araması 581 elemanlı statik dosyada (`src/tickers.ts`) | |
| 6 | Yorumda cashtag doğrulaması hiç çalışmıyor: `"$THYAO"` (önekli) `ticker` ile karşılaştırılıyor → cashtag'li her yorum reddediliyor | `api/comment/create-comment/route.ts` |
| 7 | Mention'lar kullanıcı adıyla saklanıyor; kullanıcı adı değişince eski gönderideki mention başkasına gidebilir | |

**Öğrenilen iş kuralları:** gönderi ≤ 1000 karakter; eski kodda gönderide **en az bir geçerli
cashtag** zorunluydu (v2'de kaldırılması öneriliyor, K4) ve geçersiz cashtag gönderiyi reddeder; hashtag'ler `Tag` tablosuna upsert
edilir ve gönderiye bağlanır (`_PostTags`); cashtag'ler `_PostStocks`'a bağlanır; mention edilen
kullanıcıya (kendisi değilse) `MENTION` bildirimi; `sentiment` (bullish/bearish/neutral) zorunlu.

## Karar 1 — Saklama formatı: düz metin + sunucuda hesaplanan entity listesi

- `content`: **düz metin** (NFC, `\n` satır sonu). Ör. `"$THYAO'da #bist100 kırılımı @ali"`.
- `entities` (jsonb): sunucunun yazma anında **kendi** parse edip çözdüğü liste. İstemcinin
  gönderdiği entity'lere asla güvenilmez.
- `contentFormat`: `1` eski markup, `2` düz metin. Eski uygulamanın INSERT'leri DEFAULT ile `1`
  alır → coexist güvenli.
- Offset birimi **UTF-16 code unit** (JS `string.slice` ile birebir), `[start, end)`. Parse ve
  render yalnızca JS'te yapılır; Postgres tarafında offset kullanılmaz.

```ts
// web/src/lib/entities/types.ts
export const ENTITY_SCHEMA_VERSION = 1;
export type Entity =
  | { type: 'cashtag'; start: number; end: number; ticker: string; stockId: number }
  | { type: 'hashtag'; start: number; end: number; slug: string; tagId: number }
  | { type: 'mention'; start: number; end: number; username: string; userId: number }
  | { type: 'url'; start: number; end: number; href: string };
export type StoredEntities = { v: typeof ENTITY_SCHEMA_VERSION; items: Entity[] };
```

- Sorgulanabilirlik ilişkisel tablolarda kalır (`_PostStocks`, `_PostTags`, `Notification`);
  `entities` yalnızca **render** içindir. İkisi aynı transaction'da aynı parse çıktısından yazılır.
- Mention `userId` ile saklanır; render'da güncel kullanıcı adı batch sorgu ile çözülür
  (sayfa başına 1 sorgu) → kullanıcı adı değişikliği eski gönderileri bozmaz, yanlış kişiye gitmez.
  Görünen metin yazıldığı gibi kalır.
- Çözülemeyen mention (kullanıcı yok) ve çözülmeyen hashtag entity'ye girmez → düz metin render.
  Geçersiz cashtag gönderiyi reddeder (iş kuralı), bu yüzden kayıtlı gönderide çözülmemiş
  cashtag olmaz.

**Alternatifler:**
- *Yalnızca metin, render'da parse:* basit ama mention çözümü kullanıcı adına bağlı kalır (#7)
  ve her render'da ek sorgu.
- *Editör JSON'u (ProseMirror/Lexical doc) saklamak:* format editör kütüphanesine kilitlenir
  (eski #1 hatasının tekrarı), sunucu doğrulaması zorlaşır.
- *Markdown/HTML:* gereksiz zenginlik, XSS yüzeyi.

**Eski veri:** `contentFormat=1` satırlar okunurken `fromLegacyMarkup()` ile
(`$(X)`→`$X`, `#(x)`→`#x`, `@(x)`→`@x`) düz metne çevrilip aynı parser'dan geçirilir; cashtag'ler
hisse indeksinden, mention'lar sayfa başına tek `username IN (...)` sorgusuyla çözülür. Kalıcı
backfill (metni ve `entities`'i yazma) contract fazında, eski uygulama emekliye ayrıldıktan sonra.

## Karar 2 — Tek entity parser (`web/src/lib/entities/`)

Saf TypeScript, bağımlılıksız, istemci ve sunucuda **aynı modül**. Editör vurgusu, autocomplete
tetikleyicisi, sunucu doğrulaması ve render hep bunu kullanır.

```ts
export const normalizeContent = (raw: string): string;          // NFC, CRLF→LF, kontrol/bidi karakterleri sil, 3+ boş satırı 2'ye indir, trim
export const parseEntities = (text: string): ParsedEntity[];      // çözümsüz (id'siz), sıralı, çakışmasız
export const findActiveTrigger = (textBeforeCaret: string): ActiveTrigger | null; // autocomplete: {kind, query, start}
export const fromLegacyMarkup = (legacy: string, options?: { resolveMention?: (id: string) => string | null }): { text: string; entities: ParsedEntity[] };
export const countChars = (text: string): number;                 // grafem sayısı (Intl.Segmenter)
export const foldTag = (name: string): string;                    // hashtag slug / arama katlaması
export const toTicker = (raw: string): string;                    // ASCII büyük harf
export const firstPreviewableUrl = (entities: ParsedEntity[]): string | null;
```

### Algoritma

1. **URL'ler önce** bulunur; aralıkları "dolu" işaretlenir. URL içindeki `#`, `$`, `@`
   (`https://x.com/a#b`, `https://x.com/@ali`) asla entity olmaz.
2. Sonra soldan sağa tek geçişte `$`, `#`, `@` tetikleyicileri; URL aralığına düşen ya da
   başka entity ile çakışan atlanır.
3. **Sol sınır** (tüm tetikleyiciler ve URL): metnin başı, boşluk karakteri (`\s`) ya da
   `( [ { " ' “ ‘` karakterlerinden biri (beyaz liste; tasarım spec'i
   `docs/design/v2-composer-and-entities.md` §2.1 ile aynı). Böylece `US$100`, `abc#def`, `C#`,
   `ali@gmail.com`, `fiyat=$THYAO`, `—$THYAO`, `😀#emoji` entity değil; `($THYAO)` entity.
   Kara liste yerine beyaz liste: öngörülebilir, editör ve render'da birebir aynı.
4. **Sağ sınır:** gövdeden sonra harf/rakam/işaret/`_` gelemez. Apostrof ve noktalama sınırdır
   → `$THYAO'nun`, `#bist100'de`, `@ali.` doğru ayrılır.

| Tür | Gövde | Ek kural | Normalizasyon |
|-----|-------|----------|---------------|
| cashtag | `[A-Za-z][A-Za-z0-9]{1,7}` | İlk karakter harf → `$100`, `$5K` değil. 2-8 karakter (mevcut 581 hissede 4-7; kripto `BTC` 3) | `toTicker`: **ASCII** büyük harf. `toLocaleUpperCase('tr')` yasak: `$sise` → `SİSE` olur, `SISE` bulunamaz |
| hashtag | `[\p{L}\p{N}\p{M}_]{1,50}` | En az bir harf (`#1` değil). 50'yi aşan hiç entity değil | `slug = foldTag`: `İ I ı → i` **önce**, sonra lowercase, `ş→s ğ→g ü→u ö→o ç→c`. `#BIST100`, `#bist100`, `#BİST100` → `bist100`. Görünen ad ilk kullanılan biçim (`Tag.tagName`) |
| mention | `[A-Za-z0-9_]{3,20}` | Sağda `@` ya da `.harf` gelemez (`@a.b`, e-posta parçaları) | lowercase. Türkçe harfli (`@ayşe`) mention değil — kullanıcı adı kuralı ASCII |
| url | `https?://` ya da `www.` ile başlar, boşluk/`<>"` ile biter | Sondaki `.,:;!?"”` ve dengesiz `)` atılır; **`'` ve `’` URL'yi bitirir** (`www.borsa.com'da`); `new URL()` geçmeli; kullanıcı:şifre içeren, nokta içermeyen host (`localhost`) reddedilir; ≤ 2048 | `href` = `www.` için `https://` eklenmiş biçim. Şemasız alan adları (`kap.org.tr`) link **değil** (yanlış pozitif: `A.Ş.`, `THYAO.IS`) |

**Autocomplete tetikleyicisi entity grameriyle aynı değildir (bilinçli):** `findActiveTrigger`
aynı sol sınırı kullanır ama sorgu karakterleri daha geniştir — cashtag sorgusu
`\p{L}[\p{L}\p{N}.]{0,19}` (`$türk` → THYAO önerisi, şirket adıyla arama), sorgu boş olabilir
(varsayılan öneriler). Seçim her zaman entity gramerine uyan metni ekler (`$THYAO `). Boşluk/
noktalama ile kapanışta sorgu bir koda tam eşleşiyorsa büyük harfe çevrilir (`$thyao ` →
`$THYAO `).

Ek sınırlar (sunucu, Zod şemasında): boş olmayan metin; `countChars ≤ 1000` gönderi, `≤ 500`
yorum (K11; sabit `src/lib/content-limits.ts` → `CONTENT_MAX_CHARS`); ≤ 10 cashtag, ≤ 10 hashtag, ≤ 10 mention (spam;
mention bildirimleri tekil ilk 10 kişiye). `countChars` **grafem** sayar
(`Intl.Segmenter('tr', { granularity: 'grapheme' })`, Node 22 ve hedef tarayıcılarda var):
`👨‍👩‍👧` = 1, `ğüşıöç` = 6 (tasarım `[CNT-04]`; prototipte doğrulandı). Sunucu ve istemci aynı
fonksiyonu kullanır.
Cashtag zorunluluğu: **yok** (bkz. K4 — eski kural kaldırılıyor). Sponsorluk anahtarı açık
gönderide tanınmış cashtag varsa `SPONSORED_CASHTAG_BLOCKED` (legal, `docs/legal/composer-metinleri.md`
"Hukuki değerlendirme 2").

`normalizeContent` şunları siler: C0 kontrol karakterleri (`\n`, `\t` hariç), bidi override/
isolate (`U+202A–202E`, `U+2066–2069`) — `$THYAO` görünüp başka metin okunmasın diye. ZWJ
(`U+200D`) emoji için korunur.

### Kabul tablosu (parser unit testlerinin çekirdeği, prototiple doğrulandı)

| Girdi | Beklenen |
|-------|----------|
| `$THYAO yükselir` | cashtag `THYAO` |
| `$100 kazandım`, `US$100`, `fiyat=$THYAO`, `—$THYAO`, `$THYAOXYZ1` | — |
| `$thyao'nun bilançosu` | cashtag `THYAO` (metin `$thyao`) |
| `$THYAO, $ASELS.` | cashtag ×2 |
| `$ALTINS1` | cashtag `ALTINS1` |
| `$BTC/$ETH` | yalnızca cashtag `BTC` (`/` sol sınır değil) |
| `#bist100'de düşüş` | hashtag `bist100` |
| `#İstanbul #ŞİŞE` | hashtag `istanbul`, `sise` |
| `#1 hisse`, `C# öğren`, `abc#def` | — |
| `https://x.com/a#b?c=$d @ali` | url (tamamı) + mention `ali` |
| `(bkz. https://kap.org.tr/tr/Bildirim/123).` | url `https://kap.org.tr/tr/Bildirim/123` |
| `www.borsa.com'da` | url `www.borsa.com` → href `https://www.borsa.com/` (kanonik) |
| `ali@gmail.com @veli_1. @ab @a.b` | mention `veli_1` |
| `@ayşe`, `http://user:pw@evil.com`, `https://localhost/x` | — |
| `😀#emoji $SISE` | yalnızca cashtag `SISE` (offset'ler UTF-16: start 9) |

Ek olarak `fast-check` (4.10.2) ile özellik testleri: (a) entity'ler sıralı ve çakışmasız,
(b) `text.slice(start,end)` her zaman tetikleyiciyle başlar, (c) `parseEntities` hiçbir girdide
exception atmaz, (d) `normalizeContent` idempotent.

### Review notları (S4 sonrası, 2026-10-10)

- **Hashtag slug'ı:** `foldTag` önce Default_Ignorable karakterleri (U+034F, U+FE00–FE0F,
  U+3164, U+115F, U+1160, U+180B–180F, ZWJ …) siler, sonra **NFKC** uygular (tam genişlik,
  matematiksel harf, bağ biçimleri sade harfe iner). `#bist` + U+034F + `100` → `bist100`; `#` + U+3164 ×2 boş slug
  → entity yok. Katlanmış slug'da Latin ile Kiril/Yunan harfi birlikteyse (`#ВIST100`) entity
  yok; tek yazı sistemli `#борса` geçerli. Gövde birleştirici işaretle başlayamaz; slug ≤ 50
  code point ve boşluk/kontrol içeremez.
- **Karar:** `foldTag` şapkalı harfleri katlar (`â→a`, `î→i`, `û→u`): `#kâr` = `#kar`.
- **`normalizeContent` ek olarak siler:** U+00AD, U+061C, U+180E, U+200B, U+200C, U+200E,
  U+200F, U+2060–2064, U+FEFF, U+E0000–E007F (`$TH` + U+200B + `YAO` → `$THYAO`). ZWJ korunur. Bedel:
  etiket karakterli bölge bayrakları (🏴 + tag dizisi) düz bayrağa iner.
- **URL `href` kanonik:** `new URL(...).href` (punycode host, küçük harf şema/host, `\` → `/`,
  sonda `/`); görünen metin `start`/`end` aralığı. `http://①②⑦.0.0.1/` → `http://127.0.0.1/`.
  Host etiketleri LDH olmalı (`www.$THYAO` link değil); kanonik href de ≤ 2048.
  IP literal host'lar parser'da link olabilir; engelleme `safeFetch`'in ve render kontrolünün işi.
- **Karar:** `:` URL için geçerli sol sınırdır (`Kaynak:https://kap.org.tr/x`); tetikleyiciler
  için değildir.
- Sol sınırı olmayan URL adayı (`x=https://x.com/(@ali)`) link olmaz ama aralığı engellenir:
  içindeki tetikleyiciler entity/autocomplete olmaz.
- Autocomplete hashtag sorgusu `\p{M}` kabul eder (NFD `#temettü`); işaretle başlayan sorgu
  tetiklemez.
- **Eski veri:** `fromLegacyMarkup` girdiyi `normalizeContent`'ten geçirip `{ text, entities }`
  döner; markup entity'leri markup sınırlarından üretilir (`$(THYAO)$(ASELS)` iki cashtag,
  `#(borsa.istanbul)` bütün), düz metin kısmı parser'dan geçer. E-posta id'li eski mention
  (`@(ali@x.com)`) `resolveMention` ile kullanıcı adına çevrilir; çözülemezse metne
  `@kullanıcı` yazılır, e-posta **görünmez** (KVKK), mention üretilmez. Dönen metin tekrar
  normalize edilmez.
- Kapsam: `npm run test:coverage`, `src/lib/entities` dosya başına satır+dal ≥ %95.

## Karar 3 — Editör teknolojisi: TipTap 3 (ProseMirror), düz metin şeması + dekorasyon

| Kriter | Textarea + overlay (react-mentions benzeri) | Lexical 0.52 | **TipTap 3.31 (öneri)** | Kendi contenteditable |
|--------|------|---------|--------|------|
| Zengin stil (renk, arka plan, padding, hover kartı, ikon) | Sadece genişliği değiştirmeyen stil (overlay hizası) → kullanıcının "çok sınırlı" şikâyetinin kaynağı | Var (node'lar) | Var (inline decoration) | Var |
| Model = düz metin | Doğal | Node ağacı; `getTextContent()` | Doc yalnızca `paragraph` + `text`; `getText({blockSeparator:'\n'})` | Elle |
| Parser ile tutarlılık | Overlay ayrı regex | Transform'lar text node'ları **böler**; entity node'ları ile parser senkronu ayrı kod | **Decoration'lar doc'u değiştirmez**: her değişiklikte `parseEntities(paragraphText)` → `Decoration.inline` — editör ile sunucu aynı fonksiyonu kullanır, imleç zıplaması yok | Elle, yüksek risk |
| Autocomplete | Elle (caret ölçümü) | `LexicalTypeaheadMenuPlugin` | `@tiptap/suggestion` (klavye, konum, çoklu tetikleyici); tetikleme kuralı `findActiveTrigger` ile override — S8 review'da bütçe için yerine tek ProseMirror eklentisi yazıldı | Elle |
| IME / mobil klavye | En iyi (yerel textarea) | İyi | İyi (ProseMirror olgun) | Zor |
| Olgunluk / API kararlılığı | — | 0.x, sık kırıcı değişiklik | 3.x kararlı, ProseMirror 10+ yıllık | — |
| Paket | ~0 | Orta | Orta-büyük (`@tiptap/pm`) | ~0 |

**Neden TipTap:** Gereken her şey (zengin inline stil, çoklu tetikleyicili autocomplete, düz
metin modeli) karşılanıyor ve **dekorasyon** modeli "tek parser" ilkesini editöre doğrudan
taşıyor. Lexical da yapabilir ama stil için doc'u bölmek gerekir; 0.x API'si ekstra bakım yükü.
Overlay yaklaşımı kullanıcının açıkça reddettiği sınırı taşır.

**Kurulum** (StarterKit **kullanılmaz** — bold/italic/list istenmiyor):
`@tiptap/pm`, `@tiptap/core`, `@tiptap/extension-document`, `-paragraph`, `-text` — hepsi
3.31.4, `@floating-ui/dom` 1.8.0 (popup konumu). `@tiptap/react`, `@tiptap/suggestion` ve
`@tiptap/extensions` S8 review'da bütçe için çıkarıldı: editör `useComposerEditor` +
`ComposerEditorContent` ile kurulur, autocomplete `editor/autocomplete.ts`'teki tek eklenti,
placeholder/geçmiş `editor/basics.ts`.

**Davranış kuralları:**
- Şema yalnızca `doc > paragraph+ > text*`. Hiç mark/node yok → yapıştırılan HTML **yapısal
  olarak** düz metne düşer; ayrıca `editorProps.clipboardTextParser` + `transformPastedHTML`
  ile her yapıştırma düz metin yolundan geçer ve `normalizeContent` uygulanır.
- `EntityDecorations` eklentisi: her `docChanged`'de paragraf başına `parseEntities` →
  `Decoration.inline(from, to, { class, 'data-entity': type })`. İstemcideki hisse indeksiyle
  bilinmeyen cashtag ayrı sınıf alır (ör. kesikli alt çizgi + `aria-invalid` mesajı) — stil
  kararları ui-ux-designer'da.
- Mention/cashtag/hashtag seçimi **düz metin** ekler (`$THYAO `, sonda boşluk); atom node yok →
  kullanıcı serbestçe düzenleyebilir, saklama formatıyla birebir.
- Karakter sayacı `countChars` (sunucuyla aynı); sınırı (gönderi 1000, yorum 500 — **K11**)
  aşınca gönder pasif, aşan kısım dekorasyonla işaretlenir (metin kesilmez). Sınırlar tek
  kaynaktan: `src/lib/content-limits.ts` (`CONTENT_MAX_CHARS`); composer ve S10 sunucu
  şemaları bu sabiti import eder, sayıyı tekrar yazmaz.
- Yapıştırma ve sürükle-bırak aynı düz metin yolundan geçer (`normalizePastedText`); tek
  seferde en fazla 20.000 karakter eklenir, fazlası kırpılır (taslak şemasının üst sınırı).
- SSR: `useEditor({ immediatelyRender: false })`; composer `next/dynamic` ile lazy, yüklenene
  kadar aynı yükseklikte skeleton (CLS yok). Composer chunk hedefi ≤ 100 KB gz; CI'da
  `npm run size:check` (`scripts/bundle-budget.ts`) gerileme kapısı. S8 review sonrası ölçüm:
  120,3 → 102,5 KB gz (`@tiptap/react`, `@tiptap/suggestion`, `@tiptap/extensions` ve Radix
  RadioGroup/Switch çıkarıldı; autocomplete tek ProseMirror eklentisi). Kalanın ~82 KB'ı
  `@tiptap/core` + ProseMirror; 100'ün altı `@tiptap/core`'u bırakıp doğrudan ProseMirror
  kullanmayı gerektirir (≈ −24 KB, **karar gerekli**). CI bütçesi şimdilik 104 KB.
- Taslak koruma (auth-session kural 5): `UNAUTHENTICATED` dönüşünde editör içeriği korunur.
  Kalıcı taslak tasarım spec'i §1.8'deki gibi `localStorage` (`bz:draft:{userId}:post`,
  `bz:draft:{userId}:comment:{postId}`, 7 gün, **çıkışta hepsi silinir**). Anahtarda DB'deki
  sayısal `userId` kullanılır, Firebase uid kullanılmaz; taslakta yalnızca metin, sentiment,
  sponsorluk ve önizleme-kapatıldı bayrağı — token/e-posta yok (auth-session kuralıyla uyumlu).
  Taslak cihazdan çıkmaz.
- Erişilebilirlik: editör `role="textbox" aria-multiline="true"` + etiket; popup açıkken
  `aria-autocomplete="list"`, `aria-controls`, `aria-activedescendant`; liste `role="listbox"`,
  öğeler `role="option"`. Sonuç sayısı `aria-live="polite"` ile duyurulur. `aria-expanded`
  **kullanılmaz**: ARIA 1.2'de `textbox` rolünde geçersiz (axe `aria-allowed-attr`); açık liste
  `aria-controls` (+ `data-ac-open`) ile bildirilir.
- IME kompozisyonu sürerken liste **açık kalır** (Android Gboard her kelimeyi kompozisyon
  olarak yazar); kompozisyon sırasında tuşlar (`↑/↓/Enter/Tab`) yakalanmaz (`event.isComposing`).

## Karar 4 — Autocomplete veri kaynakları ve API

| Tetikleyici | Kaynak | Sıralama | Gecikme |
|-------------|--------|----------|---------|
| `$` | `GET /api/autocomplete/stocks` → **tüm hisse indeksi** (`{t, n, type, m?}[]`, ~600 kayıt, ~15 KB gz; `m` = son 7 günde anıldığı gönderi sayısı, sıralamada eşitlik bozucu, yoksa 0), sunucuda `unstable_cache` + tag `stocks` (24 saat; stock sync sonrası `POST /api/revalidate/stocks` → `revalidateTag` + Vercel `invalidateByTag`), `Cache-Control: public, max-age=3600, s-maxage=86400`. İstemcide TanStack Query `staleTime: 1 saat`, filtreleme yerel | 1) kod tam eşleşme 2) kod önek 3) şirket adında kelime başı eşleşme (`foldTag` ile ı/i, ş/s katlamalı) 4) içerir; eşitlikte kod alfabetik (`localeCompare('tr')`). En fazla 8 | 0 ms (ağ yok), debounce yok |
| `@` | `GET /api/autocomplete/users?q=` (girişli kullanıcı) | 1) kullanıcı adı tam eşleşme 2) takip ettiklerim önek 3) diğerleri kullanıcı adı önek 4) görünen ad kelime başı. Engelleyen/engellenen (iki yön) ve `status != active` hariç. En fazla 8 | debounce 150 ms. `q` boşsa (yalnızca `@`) varsayılan: takip ettiklerim, son takip edilen önce |
| `#` | `GET /api/autocomplete/tags?q=` | `slug` önek (önek eşleşen en son kullanılan 200 aday); sıralama: 1) slug tam eşleşme 2) son 30 gündeki kullanım (azalan) 3) `updatedAt` (son kullanım) azalan 4) slug bayt sırası. En fazla 8. Yazılan etiket listede yoksa "yeni etiket: #..." son satır. `q` boşsa son 24 saatte en çok kullanılanlar (`_PostTags` ⋈ `Post.createdAt`, 10 dk cache) | debounce 150 ms |
| `$` (boş sorgu) | `GET /api/autocomplete/stocks/default` (girişli) → `{ source: 'following' \| 'mostMentioned', tickers: string[] }` (en fazla 50 kod): takip ettiğim hisseler, yoksa son 24 saatte en çok anılanlar (gönderi sayısı, nötr ölçüt). Başlık `source`'a göre seçilir | — | tek istek, composer açılınca |

- İstemci: `useQuery({ queryKey: ['ac', kind, q], signal })` → eski istekler `AbortSignal` ile
  iptal, `placeholderData: keepPreviousData` ile liste titremez. Yarış durumu, `findActiveTrigger`
  sonucunun güncel sorguyla eşleşmesi kontrol edilerek önlenir.
- Klavye: `↑/↓` gezinir (döngüsel), `Enter`/`Tab` seçer, `Esc` kapatır (metin kalır), boşluk
  veya sınır karakteri popup'ı kapatır. IME composition sürerken liste açık kalır, tuşlar yakalanmaz. Mobilde dokunma
  hedefi ≥ 44px.
- Durumlar: yükleniyor (ilk 150 ms boş, sonra 3 satır skeleton), boş ("Eşleşen hisse yok"),
  hata (tek satır, liste kapanmaz, yazım engellenmez).
- Sunucu: `q` Zod ile katlanır (`foldTag`). Kullanıcı: katlanmış `[a-z0-9_]{0,20}`. Etiket:
  50 kod noktası sınırı katlamadan **önce** (NFKC açılımı — `ﬁ` → `fi`, U+FDFA → 18 harf — kısa
  girdiyi uzun sorguya çevirmesin) ve sonra da uygulanır. Sorgu `username` için
  `lower(username) text_pattern_ops` btree önek index'i (yeni migration), `Tag.slug` önek için
  aynısı; aralık operatörleri (`~>=~`/`~<~`) ile generic planda da index kullanılır (EXPLAIN
  testi).
- **Görünen ad araması iki aşamalı** (S7 review): önce kullanıcı adı (tam eşleşme + önek,
  index'li); sonuç 8'den azsa ve sorgu 2+ karakterse ikinci sorgu görünen adda kelime başı
  araması yapar (`fold_tag(displayName)`, index'siz tarama) ve yalnızca kalan yer kadar satır
  döner. Trigram (`pg_trgm`) ya da katlanmış görünen ad kolonu + index M1'de yok. **Eşik:**
  aktif kullanıcı sayısı **20.000**'i geçtiğinde ya da `/api/autocomplete/users` p95 süresi
  **100 ms**'yi aştığında (hangisi önce olursa) `displayNameFolded` kolonu (yazımda
  `fold_tag`) + `gin_trgm_ops` index'i eklenir ve ikinci aşama ona taşınır.
- **Etiket sayımları paylaşılan önbellekte** (S7 review): son 30 günlük kullanım, kullanıcı ve
  sorgudan bağımsız tek sorguda (`_PostTags ⋈ Post`, `GROUP BY tagId`) toplanır ve
  `unstable_cache` ile 10 dk önbelleklenir (tag `autocomplete:tag-usage`, elle invalidation
  için). İstek yalnızca `Tag` önek adaylarını okur ve `tagId → count` haritasıyla bellekte
  birleştirip sıralar; istek başına `_PostTags` taranmaz (EXPLAIN + SQL kaydı testi). Sayım en
  fazla 10 dk bayattır; sıralama ölçütü olduğu için kabul edilir. Trend etiketleri (boş `#`)
  ve "en çok anılan" hisseler de aynı biçimde `unstable_cache` 10 dk.
- **HTTP önbelleği** (S7 review): kullanıcıya özel uçlar (`/stocks/default`, `/users`,
  `/tags`) `Cache-Control: private, no-store`. Yanıt görüntüleyene göre değişir (takip,
  engelleme); `max-age` aynı tarayıcıda çıkış/başka hesapla giriş sonrası önceki kullanıcının
  listesini sunabilirdi. Doğrulayıcı (ETag) olmadığından `no-cache` da tam istek demektir;
  diske yazılmaması için `no-store` seçildi. İstemci tazeliği TanStack Query `staleTime` ile
  (hisse varsayılanı 1 saat, öneriler 30 sn; bellekte, oturumla birlikte temizlenir). Yalnızca
  herkese açık hisse indeksi CDN'de paylaşılır. Hata yanıtları `no-store`.
- **Gövde biçimi** (bilinçli ayrım): S7 autocomplete uçları başarıda **çıplak gövde** döner
  (dizi ya da `{ source, tickers }`; istemci şemaları `composer/schemas.ts`), hata `Result`
  zarfının `{ ok: false, error }` kolu ve HTTP durum kodu. Gerekçe: her tuşta çağrılan, tek
  tüketicili okuma uçları; HTTP durumu başarıyı zaten ayırır ve `$` indeksi CDN'de paylaşılan
  ham veridir. S9 link önizleme ise `Result` zarfı (`{ ok: true, data: { preview } }`) döner
  çünkü "önizleme yok" (`preview: null`) başarılı bir sonuçtur ve sözleşme Server Action
  dönüşleriyle aynı tutulur. Yeni okuma uçları bu iki desenden birini açıkça seçer.
- Rate limit: kullanıcı başına 60 istek/dk (Postgres bucket yerine bellek içi, instance başına
  best-effort + Vercel Firewall kuralı; autocomplete'te her tuşta DB'ye sayaç yazmak sorgunun
  kendisinden pahalı).
- DTO: `{ username, displayName, avatarUrl, following }` — e-posta/firebaseUid asla.
  `following: boolean` görüntüleyenin bu kişiyi takip edip etmediği ("Takip ediyorsun" satırı,
  sıralamada 2. ölçüt). `avatarUrl` yalnızca `https`, port/kullanıcı bilgisi yok ve medya
  allowlist'indeki host (`src/lib/media` → `toSafeMediaSrc`); uymayan değer istemcide `null`'a
  düşer (baş harfler gösterilir). **Asıl süzgeç sunucuda** (S7 review): DTO üretirken
  `toSafeStorageMediaSrc(url, FIREBASE_STORAGE_BUCKET)` yolu da kontrol eder —
  `firebasestorage.googleapis.com` için yalnızca `/v0/b/<bucket>/`, `storage.googleapis.com`
  için yalnızca `/<bucket>/` (iki host da herkesin bucket'ını barındırır; başka bucket izleme
  pikseli olabilir). Bucket istemciye `NEXT_PUBLIC_` ile taşınmaz; istemci host düzeyinde kalır
  (savunma derinliği) ve sunucudan zaten süzülmüş URL alır.
- Sözleşme kaynağı: `src/features/composer/types.ts` + `schemas.ts` (istemci Zod şemaları);
  S7 bu biçimi döndürür.

## Karar 5 — Render ve XSS güvenliği

- `<RichText text entities />` **Server Component**; metni entity sınırlarından parçalara bölüp
  React çocukları olarak döndürür. Düz parçalar string (React escape eder). Satır sonları CSS
  `white-space: pre-wrap` ile (`<br>` üretimi yok). `dangerouslySetInnerHTML` yok — ESLint
  `react/no-danger: error`.
- cashtag → `<Link href="/hisse/THYAO">` (hover kartı: şirket adı + yatırım tavsiyesi değildir
  uyarısı; fiyat yok, v1 kapsamı). hashtag → `/etiket/<slug>`. mention → `/u/<güncel ad>`.
- url → `<a href={href} target="_blank" rel="nofollow ugc noopener noreferrer">`; `href`
  render anında yeniden doğrulanır (yalnızca `http:`/`https:`; aksi halde düz metin). Görünen
  metin: şema atılmış, 32 karakterde `…` ile kısaltılmış hâl (tasarım §5, `URL_DISPLAY_MAX`);
  tam URL `title`'da. Host punycode gösterilir (homograf). Uzun host ortadan kesilir; kayıtlı
  alan adı (eTLD+1) her zaman görünür (`kap.org.tr.bildi…-12345.evil.com`). Path yüzde kodları
  çözülerek, bidi/görünmez karakterler atılarak gösterilir.
- Entity offset'leri metinle uyuşmazsa (bozuk veri) `RichText` o entity'yi atlar, log yazar,
  düz metin render eder — asla throw etmez.
- Eski `useHighlightUrls` deseni (DOM'a `innerHTML`) yeniden üretilmez.

## Karar 6 — Link önizleme (SSRF korumalı)

**Akış:**
1. Composer, ilk önizlenebilir URL'yi (`firstPreviewableUrl`) 600 ms debounce ile
   `GET /api/link-preview?url=` çağırır (girişli, kullanıcı başına 20/dk). Kullanıcı kartı
   kapatabilir (`previewDisabled: true` gönderilir).
2. Sunucu `urlHash = sha256(normalize(url))` ile `LinkPreview`'a bakar; geçerliyse döner,
   değilse `safeFetch` ile çeker, kaydeder (başarısızlık da `failed`/`blocked` olarak 1 saat
   cache'lenir).
3. `createPost`, önizleme URL'sini sunucuda yeniden parse eder; kayıt yoksa gönderiyi
   bekletmez — `after()` ile arka planda çeker ve `Post.linkPreviewId`'yi bağlar.
4. Akış/detay, önizlemeyi gönderiyle aynı sorguda (`include`) okur. **Gönderi başına istemci
   isteği yok** (eski hatanın tersine).

**Yanıt biçimi** (`GET /api/link-preview?url=`, istemci şeması `linkPreviewResponseSchema`;
S9 ile güncellendi — ilk taslaktaki `status: 'ok' | 'none'` biçimi kullanılmıyor):

```ts
{ ok: true; data: { preview:
    | { url: string; host: string; siteName: string | null;
        title: string;               // ≤ 120 (şema üst sınırı 300)
        description: string | null } // ≤ 200 (şema üst sınırı 500)
    | null } }                       // önizleme yok / çekilemedi / engellendi — kart gösterilmez
```
Hata ayrıntısı (blocked, timeout vb.) istemciye sızdırılmaz; hepsi `preview: null`.
Hata gövdesi `{ ok: false, error }` (Karar 4 "Gövde biçimi": S7 çıplak gövde, S9 `Result` zarfı). 4xx/5xx yalnızca
kimlik/oran sınırı/doğrulama içindir (`UNAUTHENTICATED`, `RATE_LIMITED`, `VALIDATION`).

**`lib/safe-fetch` kuralları:**
- Yalnızca `http:`/`https:`, port 80/443, kullanıcı bilgisi yok, host IP literal ise de aynı
  kontrol.
- DNS çözümü (`dns.lookup(all)`) → **tüm** adresler kontrol: loopback, private (10/8,
  172.16/12, 192.168/16), link-local (169.254/16 — bulut metadata dahil), CGNAT (100.64/10),
  0/8, multicast, reserved, IPv6 `::1`, `fc00::/7`, `fe80::/10`, IPv4-mapped IPv6 (`::ffff:a.b.c.d`)
  → `blocked`. Kontrol `ipaddr.js` 2.5.0 ile (`range() === 'unicast'`).
- **DNS rebinding:** doğrulanan IP'ye bağlanılır — `undici` 8 `Agent({ connect: { lookup } })`
  ile özel lookup, bağlantı anında aynı kontrolü tekrar yapar.
- Yönlendirmeler elle (`redirect: 'manual'`), en fazla 3, her adım baştan doğrulanır.
- Toplam zaman aşımı 3 sn, gövde en fazla 512 KB (stream sayılarak kesilir), yalnızca
  `text/html`. Sabit User-Agent `BorsaliyorumBot/1.0 (+https://borsaliyorum.com/bot)`.
  Cookie/Authorization başlığı gönderilmez.
- Parse `htmlparser2` ile (stream, `</head>` görülünce durur): `og:title`, `og:description`,
  `og:site_name`, `twitter:*`, `<title>`, `meta[name=description]`. Değerler: kontrol/bidi
  karakterleri temizlenir, HTML entity'leri çözülür, uzunluk kırpılır (başlık **120**, açıklama **200** — legal "Hukuki değerlendirme 4"). Yalnızca
  OG/Twitter/`meta` etiketleri okunur, sayfa gövdesinden metin alınmaz; `og:title` ve `<title>`
  yoksa kart oluşmaz. Kart her zaman host'u gösterir ve orijinal URL'ye link verir. Render'da
  yine düz metin.
- **Görsel M1'de yok** (karar gerekli K6): `og:image`'ı doğrudan göstermek (hotlink) her
  izleyicinin IP'sini üçüncü tarafa sızdırır ve keyfi içerik gösterir; proxy'lemek de
  `_next/image`'i açık proxy yapmamak için ayrı bir indir→`sharp` ile yeniden kodla→Storage'a
  yaz hattı gerektirir. Öneri: M1 metin kartı (site, başlık, açıklama, alan adı); M2'de
  görsel hattı.
- Alan adı engelleme listesi (moderasyon) `safeFetch` öncesi kontrol edilir (M2'de admin'den).
  M2 görsel hattı legal gereksinimlerine uyar: yalnızca `og:image`/`twitter:image`, ≤ 600 px,
  yeniden kodlama + metadata silme, hedef sayfa `noarchive`/`noimageindex` taşıyorsa görsel yok,
  gönderiyi silmeden yalnızca kartı/görseli kaldırabilme.

## Karar 7 — Sunucu sözleşmeleri (M1)

```ts
// features/posts/server/actions.ts  ('use server')
createPost(input: {
  text: string;
  sentiment: Sentiment;            // cashtag yoksa sunucu 'neutral'e zorlar (tasarım §1.5)
  isSponsored: boolean;            // legal: Reklam / İşbirliği etiketi
  previewUrl?: string | null;      // null = kullanıcı önizlemeyi kapattı
  clientRequestId: string;         // uuid; çift gönderim idempotency'si (Post.clientRequestId UNIQUE)
}): Promise<Result<{ postId: number }>>
deletePost(input: { postId: number }): Promise<Result<null>>          // sahibi ya da moderator/admin
setPostLike(input: { postId: number; liked: boolean }): Promise<Result<{ liked: boolean }>> // idempotent

// features/comments/server/actions.ts
createComment(input: {
  postId: number;
  text: string;                    // ≤ 500 grafem (K11, CONTENT_MAX_CHARS.comment)
  clientRequestId: string;         // uuid; Comment.clientRequestId UNIQUE (migration S10'da)
}): Promise<Result<{ commentId: number }>>
deleteComment(input: { commentId: number }): Promise<Result<null>>
setCommentLike(input: { commentId: number; liked: boolean }): Promise<Result<{ liked: boolean }>>

type Result<T> = { ok: true; data: T } | { ok: false; error: ErrorCode; meta?: ErrorMeta };
```

**`clientRequestId` kuralı (istemci):** kimlik gönderilen yükün tamamına bağlıdır — gönderide
`text + sentiment + isSponsored + previewUrl`, yorumda `text`. Aynı yükle yeniden deneme aynı
kimliği taşır; herhangi bir alan değişirse yeni kimlik üretilir (aksi halde sunucu eski kaydı
döndürür ve ör. sonradan açılan sponsorluk etiketi düşer). Sunucu aynı kimlikle gelen ikinci
isteğe ilk kaydı döndürür; yükü karşılaştırmaz.

**S10 notu:** `Comment` tablosunda `clientRequestId` yok — S10 migration'ı
`Comment.clientRequestId String? @unique` (Post ile aynı biçim) ekler; `createComment` aynı
idempotency adımını uygular. Metin sınırları `src/lib/content-limits.ts`'ten import edilir.

`createPost` sırası: Zod parse → `requireUser()` (Server Action'da redirect değil
`UNAUTHENTICATED` döner) → `status`/`emailVerified`/onboarding kontrolü → rate limit
(10 gönderi/10 dk, 60/gün) → aynı `clientRequestId` ile kayıt varsa onu döndür → `normalizeContent`
→ `parseEntities` → sınırlar → hisse çözümü (`ticker IN`) → `isSponsored` ve cashtag varsa
`SPONSORED_CASHTAG_BLOCKED` → tek transaction: `Tag` upsert (`slug` üzerinden `ON CONFLICT`), `Post`
(`contentFormat=2`, `entities`), `_PostStocks`, `_PostTags`, mention bildirimleri (engelleme
kontrolüyle, tek `createMany`), `ContentEvent` → transaction sonrası `revalidatePath` +
`after()` ile önizleme.

Hata kodları (i18n anahtarı olarak): `UNAUTHENTICATED`, `ONBOARDING_REQUIRED`,
`EMAIL_NOT_VERIFIED`, `ACCOUNT_SUSPENDED`, `VALIDATION`, `CONTENT_EMPTY`, `CONTENT_TOO_LONG`,
`UNKNOWN_CASHTAG` (`meta.tickers`), `SPONSORED_CASHTAG_BLOCKED`, `TOO_MANY_ENTITIES`, `RATE_LIMITED`
(`meta.retryAfter`), `NOT_FOUND`, `FORBIDDEN`, `INTERNAL`.

## Sonuçlar

- (+) Tek parser: editör vurgusu, autocomplete, sunucu doğrulaması ve render aynı kuralla.
- (+) Saklama formatı editörden bağımsız; editör ileride değişse veri değişmez.
- (+) Önizleme sunucuda, cache'li, SSRF korumalı; akışta N istek yok.
- (−) TipTap/ProseMirror paketi büyük → composer lazy yüklenir, bütçe ölçülür.
- (−) contenteditable davranışı jsdom'da test edilemez → composer testleri gerçek tarayıcıda
  (ADR-0003).
- (−) `entities` ile ilişkisel tablolar arasında çift kayıt; tek transaction ve tek parse
  çıktısı ile tutarlı tutulur, test edilir.

## Karar gerekli (kullanıcı)

| # | Konu | Öneri |
|---|------|-------|
| K4 | Gönderide ≥ 1 geçerli cashtag zorunluluğu (eski kural) sürsün mü? | **Hayır, kaldırılsın.** Tasarım (duyarlılık seçimi yalnızca cashtag varken) ve hukuk (sponsorlu gönderide cashtag yasak) cashtag'siz gönderiyi varsayıyor; zorunluluk sürerse sponsorlu gönderi imkânsızlaşır |
| K5 | Bilinmeyen cashtag: gönderiyi reddet mi, düz metin mi say? | Reddet (eski kural) + editörde önceden işaretle, hata mesajında hangi kodlar olduğu |
| K6 | Link önizlemede görsel | M1'de görsel yok; M2'de proxy + Storage hattı |

## Hukuki sorular (legal-advisor'a)

- **L5** Link önizleme: `docs/legal/composer-metinleri.md` "Hukuki değerlendirme 4" ile büyük
  ölçüde yanıtlandı (başlık/açıklama düşük risk; görsel ORTA risk, **avukat onayı gerekli**).
  Bu ADR o gereksinimlere uyar; M2 görsel hattı avukat onayına bağlı.
- **L7** Kısa yatırım uyarısı metni ve yerleşimi legal dokümanının "Hukuki değerlendirme 1"
  bölümünde; uygulama i18n anahtarını (`legal.disclaimer.short`) kullanır, metni kodda tekrar
  etmez. Avukat onayı bekleniyor.
