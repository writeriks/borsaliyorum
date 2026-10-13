# Borsalıyorum v2: Composer, Autocomplete ve Entity Spesifikasyonu

> Durum: taslak v0.1 (2026-10-10), sahibi `ui-ux-designer`.
> Bağlı: `docs/design/v2-design-system.md`, `docs/design/tokens.css`.
> Editör teknolojisi, veri formatı ve API'ler `architect`'in kararı. Bu doküman **davranış
> ve görünüm** sözleşmesidir. Kabul kriterleri (`[ID]`) Playwright testlerine birebir
> dönüşecek şekilde yazıldı. Locator'lar rol ve erişilebilir ad tabanlı (`getByRole`).
> Metinler i18n anahtarlarıyla §8'de.

İşaretler: ⚖️ legal-advisor metni ya da onayı gerekiyor · 🔒 security-reviewer kapsamında ·
🏗 architect kararı gerekiyor.

---

## 0. Test fixture'ları (tüm kriterlerde kullanılır)

| Hisse | Şirket adı | Tür | 7 günlük bahis |
|-------|------------|-----|----------------|
| THYAO | Türk Hava Yolları A.O. | stock | 900 |
| TUPRS | Tüpraş-Türkiye Petrol Rafinerileri A.Ş. | stock | 400 |
| TTKOM | Türk Telekomünikasyon A.Ş. | stock | 300 |
| ISCTR | Türkiye İş Bankası A.Ş. (C) | stock | 500 |
| ISGYO | İş Gayrimenkul Yatırım Ortaklığı A.Ş. | stock | 50 |
| SISE | Türkiye Şişe ve Cam Fabrikaları A.Ş. | stock | 350 |
| ASELS | Aselsan Elektronik Sanayi ve Ticaret A.Ş. | stock | 800 |
| BTC | Bitcoin | crypto | 200 |

Kullanıcılar: `aysek` (Ayşe Kaya, takip ediliyor), `aysegul` (Ayşegül Demir),
`mehmet_y` (Mehmet Yılmaz), `engelli` (oturumdaki kullanıcıyı engellemiş).
Etiketler: `bist100` (12.345 gönderi), `bilanço` (2.100), `bist30` (800), `temettü` (640).
Oturum: aksi belirtilmedikçe `aysegul` olarak giriş yapılmış, koyu tema, `tr`.

---

## 1. Composer

### 1.1 Varyantlar

| Varyant | Nerede | Kabuk | Özellikler |
|---------|--------|-------|-----------|
| `post-inline` | Masaüstü/tablet akış başı (md+) | Kart, `--bg-subtle` | Kapalıyken tek satır, odakta genişler |
| `post-dialog` | Sol menüde "Gönderi paylaş" (md+) | Dialog 600px, `--bg-elevated` | Tam özellik |
| `post-sheet` | Mobil "Gönderi" sekmesi (< md) | Tam ekran sheet, `/compose` rotası | Tam özellik, toolbar klavyenin üstünde |
| `comment` | Gönderi detayı | Satır içi; mobilde altta sticky | Duyarlılık ve sponsorluk anahtarı yok, sınır 500 |

### 1.2 Anatomi

**post-dialog / post-inline (açık), masaüstü**
```
┌──────────────────────────────────────────────────────────────┐
│ Yeni gönderi                                            [X]  │  (yalnızca dialog)
├──────────────────────────────────────────────────────────────┤
│ [Reklam / İşbirliği]                 ← anahtar açıksa önizleme│
│ (●40)  $THYAO için bilanço beklentim olumlu, #bist100 de     │  editör, text-post
│        güçlü. @aysek ne dersin? https://www.kap.org.tr/tr/…  │  min 3 satır, max 50vh
│        ┌──────────────────────────────────────────────┐ [X]  │
│        │ link önizleme / görsel                       │      │
│        └──────────────────────────────────────────────┘      │
│ Kaydedilmemiş taslağın geri yüklendi. Taslağı sil            │  (gerekirse)
├──────────────────────────────────────────────────────────────┤
│ Görüşün  (▲ Yükseliş) (▼ Düşüş) (● – Nötr)  ⓘ               │  yalnızca cashtag varsa
│ İşbirliği/sponsorluk içeriği                        [ ○── ]  │
├──────────────────────────────────────────────────────────────┤
│ [🖼] [GIF] [$] [#] [@]                   ◔ 120   [ Paylaş ]  │  toolbar
│ <kısa uyarı metni ⚖️>  Ayrıntılar                            │  text-xs fg-subtle
└──────────────────────────────────────────────────────────────┘
```

**post-sheet, mobil**
```
┌──────────────────────────────┐
│ [X]    Yeni gönderi  [Paylaş]│  üst bar 56, Paylaş sağ üstte (başparmak + görünürlük)
├──────────────────────────────┤
│ [Reklam / İşbirliği]         │
│ (●) Ne düşünüyorsun?         │  editör 16px (iOS zoom önleme)
│                              │
│ [görsel / link önizleme]     │
│            ⋮                 │
├──────────────────────────────┤  ← autocomplete açıkken bu bölge yerine
│ Görüşün (▲)(▼)(–)            │    öneri paneli gelir (§2.6)
│ İşbirliği içeriği     [ ○ ]  │
│ <kısa uyarı ⚖️> Ayrıntılar   │
├──────────────────────────────┤
│ [🖼][GIF][$][#][@]     ◔ 120 │  toolbar, visualViewport ile klavyeye yapışık
└──────────────────────────────┘
          ▒▒ klavye ▒▒
```

**comment**
```
┌──────────────────────────────────────────────────────────┐
│ Yanıtlanan: @aysek                                       │  text-xs fg-subtle
│ (●32) Yanıtını yaz                     [🖼][GIF] [Yanıtla]│  tek satır, odakta büyür
└──────────────────────────────────────────────────────────┘
```
- `$`, `#`, `@` toolbar butonları tetikleyiciyi imleç konumuna (gerekirse önüne boşluk
  koyarak) ekler ve autocomplete'i açar. **Gerekçe:** Türkçe Q klavyede `$` AltGr+4 ile,
  mobil klavyelerde ise ikinci sembol sayfasında. Cashtag ürünün çekirdeği, bir dokunuşla
  erişilebilmeli.

**Kabul kriterleri**
- `[CMP-01]` md+ genişlikte akış başında `post-inline` composer görünür. Erişilebilir adı
  "Gönderi yaz" olan bir `textbox` vardır. Placeholder "Ne düşünüyorsun?".
- `[CMP-02]` `post-inline` boş ve odaksızken yüksekliği ≤ 72px, toolbar görünmez. Odaklanınca
  toolbar görünür. Boşken odak kaybedilince tekrar kapanır.
- `[CMP-03]` < md genişlikte tab bar'daki "Gönderi" sekmesine dokununca URL `/compose` olur,
  tam ekran sheet açılır ve editör odaklanır. Tarayıcı geri tuşu sheet'i kapatır.
- `[CMP-04]` 375×667 viewport'ta sanal klavye açıkken (visualViewport yüksekliği küçülünce)
  toolbar görünür alanın en altında kalır. Paylaş butonu ekranda görünür kalır.
- `[CMP-05]` Toolbar'daki `$` butonuna basınca editöre `$` eklenir ve hisse öneri listesi açılır.
  İmleçten önce boşluk dışı bir karakter varsa önce boşluk eklenir.
- `[CMP-06]` Mobilde editörün hesaplanan `font-size` değeri ≥ 16px.
- `[CMP-07]` `Ctrl+Enter` / `Cmd+Enter` geçerli içerikte gönderir. Geçersiz içerikte hiçbir şey
  yapmaz.
- `[CMP-08]` Zengin metin yapıştırılınca yalnızca düz metin eklenir (HTML, stil yok).
- `[CMP-09]` Dialog'da `Esc` önce açık autocomplete'i kapatır. Autocomplete kapalıysa composer'ı
  kapatır (içerik varsa §1.8 taslak sorusuyla).

### 1.3 Karakter sayacı

- Sınır: gönderi **1000**, yorum **500** (🏗 kesinleştirilecek, eski kod 1000/sınırsız).
- Sayım birimi: **grafem** (`Intl.Segmenter`). Emoji, bayrak ve birleşik karakterler 1
  sayılır. Entity'ler görünen metinleriyle sayılır (`$THYAO` = 6), URL'ler tam
  uzunlukla sayılır.
- **Kesme yok**: Kullanıcı sınırı aşan metni yazabilir ya da yapıştırabilir, metin
  sessizce kesilmez (eski `maxLength=1000` yapıştırılan metni sessizce kesiyordu).
  Aşan kısım `--danger-bg` zeminle vurgulanır.

| Kullanım (gönderi / yorum) | Görünüm |
|---|---|
| < %80 (< 800 / < 400) | Sayaç gizli (sakin yüzey) |
| %80–%97 (800–979 / 400–484) | 20px halka (`--fg-subtle`) + kalan sayı, `text-xs tabular-nums` |
| %98–%100 (980–1000 / 485–500) | Halka ve sayı `--warn` |
| > %100 | Halka ve sayı `--danger`, negatif sayı (`-12`), Paylaş devre dışı |

- Ekran okuyucu: Her tuşta duyuru yapılmaz. Kalan 100, 20, 0 ve sınır aşıldı eşiklerinde
  `aria-live="polite"` ile tek seferlik duyuru yapılır.

**Kabul kriterleri**
- `[CNT-01]` 799 karakterde sayaç görünmez. 800'de "200" metni görünür.
- `[CNT-02]` 985 karakterde sayaç metninin rengi `--warn` olur.
- `[CNT-03]` 1012 karakter yapıştırılınca editörde 1012 karakter vardır, sayaç "-12"
  gösterir, Paylaş `aria-disabled="true"` olur, aşan 12 karakter `data-overflow` işaretli
  bir aralıktadır.
- `[CNT-04]` "👨‍👩‍👧" (ZWJ dizisi) 1 karakter sayılır. "ğüşıöç" 6 karakter sayılır.
- `[CNT-05]` Kalan 20'ye inince live region "Kalan karakter: 20" metnini bir kez içerir.
  21'den 19'a yazarken ek duyuru olmaz.
- `[CNT-06]` Yorum composer'ında sınır 500 uygulanır (400'de sayaç görünür).

### 1.4 Görsel ve GIF ekleme

- **Tek medya** (veri modelinde tek `mediaUrl` var; çoklu görsel 🏗 açık soru). Görsel varken
  GIF butonu devre dışı, GIF varken görsel butonu devre dışı. Tooltip: "Tek bir görsel ya da
  GIF ekleyebilirsin."
- **Görsel ekleme yolları:** toolbar butonu (dosya seçici), sürükle-bırak (md+, composer
  üzerinde "Görseli buraya bırak" katmanı), panodan yapıştırma.
- **Kabul edilen türler:** JPG, PNG, WebP (🔒 boyut sınırı security'den, UI varsayılanı 5 MB).
  🔒⚖️ EXIF (özellikle konum) sunucuda temizlenir.
- **Önizleme:** `radius-lg`, maksimum yükseklik 320, doğal oran.
  - Sağ üstte "Görseli kaldır" (X) butonu. Görsel 32px, dokunma alanı 44.
  - Sol altta "Açıklama ekle" (ALT) butonu açılınca 420 karakterlik alt metin alanı açılır.
    Alt metin eklenmişse buton "Açıklamayı düzenle" olur ve ✓ gösterir.
  - Yükleme hemen başlar. Altta 4px ilerleme çubuğu (`--accent`) ve ekran okuyucu için
    `role="progressbar"` + `aria-valuenow` var. Yükleme sürerken Paylaş devre dışı,
    tooltip "Görsel yükleniyor".
  - Hata: Görselin üstünde `--overlay/0.6` katman, "Yüklenemedi." ve [Tekrar dene] [Kaldır].
- **GIF seçici** (⚖️🔒 sağlayıcı seçimi açık soru. Arama sorgusu ve IP üçüncü tarafa
  gidiyor, sunucu üzerinden proxy öneriliyor):
  - md+: Popover 360×440. < md: yarım ekran sheet.
  - Üstte arama inputu (debounce 300ms), açılışta "Popüler" GIF'ler, 2 kolon grid,
    sağlayıcı atfı ("Powered by …") altta.
  - Loading: 6 skeleton hücre. Empty: "Sonuç bulunamadı. Başka bir kelime dene."
    Error: "GIF'ler yüklenemedi. Tekrar dene".
  - `prefers-reduced-motion`: Grid'de ve gönderide GIF duraklatılmış ilk kare olarak görünür,
    hover/focus'ta oynar. Gönderide ▶ "GIF'i oynat" butonu var.
  - GIF'e otomatik alt metin olarak sağlayıcı başlığı atanır, kullanıcı düzenleyebilir.

**Kabul kriterleri**
- `[MED-01]` "Görsel ekle" butonu ile 1 MB'lık PNG seçilince önizleme görünür ve
  `progressbar` 100'e ulaşınca kaybolur. Bu sırada Paylaş `aria-disabled="true"` olur.
- `[MED-02]` Görsel ekliyken "GIF ekle" butonu `aria-disabled="true"` olur.
- `[MED-03]` 6 MB görsel seçilince editör altında "Görsel en fazla 5 MB olabilir." hatası
  görünür, önizleme oluşmaz.
- `[MED-04]` Desteklenmeyen bir dosya (ör. `.pdf`, ya da görsel butonundan `.gif`) seçilince "Bu dosya türü
  desteklenmiyor. JPG, PNG ya da WebP yükleyebilirsin." hatası görünür.
- `[MED-05]` Panodan görsel yapıştırılınca önizleme oluşur.
- `[MED-06]` "Açıklama ekle" ile girilen alt metin, yayınlanan gönderideki `img` öğesinin
  `alt` niteliğidir. Alt metin girilmemişse `alt=""` olmaz, "Gönderi görseli" kullanılır.
- `[MED-07]` Yükleme hata verince (route mock 500) "Yüklenemedi." ve "Tekrar dene" görünür.
  Tekrar dene başarılı olunca hata kalkar.
- `[MED-08]` `reducedMotion: 'reduce'` ile GIF seçicideki öğeler `<img>` olarak statik kare
  gösterir (animasyonlu kaynak yüklenmez).

### 1.5 Duyarlılık seçimi (bullish / bearish / nötr)

- Yalnızca editörde **en az bir tanınmış cashtag** varsa görünür (hisse olmadan "yükseliş
  beklentisi" anlamsız). Görünmüyorsa gönderi `neutral` kaydedilir.
- Kontrol: shadcn `RadioGroup`/`ToggleGroup` (single), `role="radiogroup"`, etiketi
  "Görüşün". Seçenekler: `▲ Yükseliş`, `▼ Düşüş`, `– Nötr`. Varsayılan **Nötr** seçili
  (kullanıcıyı yön almaya itmiyoruz).
  - Görünüm: 32px yükseklik (dokunma alanı 44), `radius-full`. Seçili Yükseliş:
    `--up-bg` zemin, `--up` metin ve kenar. Seçili Düşüş: `--down-bg` / `--down`.
    Seçili Nötr: `--bg-muted` / `--fg`. Seçili olmayanlar: `--border-strong` kenar,
    `--fg-muted` metin.
  - ⓘ tooltip: "Seçimin gönderinde küçük bir etiket olarak görünür ve kişisel görüşün
    olarak gösterilir."
- Cashtag'ler silinip kontrol gizlenince seçim Nötr'e sıfırlanır.
- Render'da: Yükseliş ya da Düşüş ise başlıkta küçük etiket gösterilir (design-system §7.4).
  Nötrde etiket yoktur.

**Kabul kriterleri**
- `[SEN-01]` Cashtag yokken "Görüşün" radiogroup'u DOM'da yoktur.
- `[SEN-02]` `$THYAO` seçilince radiogroup görünür ve "Nötr" `aria-checked="true"` olur.
- `[SEN-03]` Ok tuşlarıyla seçenekler arasında gezilir (roving tabindex). Radiogroup tek bir
  tab durağıdır.
- `[SEN-04]` "Yükseliş" seçilip gönderilince akıştaki kartta "▲ Yükseliş" metinli etiket
  görünür. Glif `aria-hidden="true"`.
- `[SEN-05]` Cashtag silinince radiogroup kaybolur. Gönderilen gönderi `neutral` olur ve
  etiket gösterilmez.

### 1.6 Yasal öğeler (composer)

**a) Yatırım tavsiyesi değildir, kısa versiyon** ⚖️
- Metin **legal-advisor'dan alınacak** (`legal.disclaimer.short`). Tam metin
  `turkish-legal-compliance` skill'inde, kısa versiyonu ve link hedefi onaylanmalı.
  Tasarım yer tutucusu: `<legal.disclaimer.short> · Ayrıntılar`.
- Yerleşim: Tüm `post-*` varyantlarında toolbar'ın altında, `text-xs`, `--fg-subtle`,
  her zaman görünür, kapatılamaz. "Ayrıntılar" linki tam metne (yeni sekme değil, aynı
  sayfada dialog ya da `/yasal/yatirim-uyarisi`) gider.
- `comment` varyantında gösterilmez (🏗⚖️ açık soru, bkz. §9). Gönderi detay sayfasının
  footer'ında tam metin zaten var.

**b) Sponsorlu / işbirliği anahtarı** ⚖️
- shadcn `Switch`, `post-*` varyantlarında duyarlılık satırının altında **her zaman
  görünür** (menüye gizlenmez, çünkü beyanı kolaylaştırmak yasal amacın kendisi).
- Etiket (taslak, kaynak `tuketici-reklam-fikri.md`, legal onayıyla kesinleşir):
  "Bu içerik bir işbirliği/sponsorluk içeriyor". Yardım metni: "Açarsan gönderinin başında
  'Reklam / İşbirliği' etiketi görünür."
- Varsayılan **kapalı**, önceki gönderiden hatırlanmaz (yalnızca aynı gönderinin taslağında
  saklanır).
- Açılınca editörün üstünde, yayında görünecek etiketin önizlemesi belirir:
  `[📣 Reklam / İşbirliği]`.

**Kabul kriterleri**
- `[LEG-01]` `post-inline`, `post-dialog` ve `post-sheet` varyantlarında `legal.disclaimer.short`
  anahtarının metni ve "Ayrıntılar" linki görünür. Kapatma butonu yoktur.
- `[LEG-02]` Sponsorluk anahtarı `role="switch"` ve `aria-checked="false"` ile başlar.
  Erişilebilir adı etiket metnidir.
- `[LEG-03]` Anahtar açılınca editörün üstünde "Reklam / İşbirliği" önizlemesi görünür.
  Gönderilen gönderinin kartında bu etiket, yazar adından **önce** (DOM sırası) yer alır.
- `[LEG-04]` Sponsorlu gönderi paylaşıldıktan sonra composer yeniden açılınca anahtar kapalıdır.
- `[LEG-05]` `comment` varyantında sponsorluk anahtarı yoktur.

### 1.7 Gönderme durumları

| Durum | Paylaş butonu | Editör | Geri bildirim |
|-------|---------------|--------|---------------|
| Boş (yalnızca boşluk dahil) | `aria-disabled`, tooltip "Bir şeyler yaz" | Düzenlenebilir | Yok |
| Hazır | Etkin (`--accent`) | Düzenlenebilir | Yok |
| Sınır aşıldı | `aria-disabled` | Düzenlenebilir | Sayaç `--danger` |
| Medya yükleniyor | `aria-disabled`, "Görsel yükleniyor" | Düzenlenebilir | İlerleme çubuğu |
| Gönderiliyor | Spinner + "Paylaşılıyor", `aria-busy` | Salt okunur, toolbar devre dışı | İkinci tıklama yok sayılır (🏗 idempotency key) |
| Başarılı | Sıfırlanır | Temizlenir | Toast "Gönderin paylaşıldı." + [Görüntüle]. Dialog/sheet kapanır. Yeni gönderi akışın başına eklenir. Odak composer'da (inline) ya da tetikleyen butonda (dialog) kalır. Taslak silinir. |
| Ağ / sunucu hatası | Etkin | İçerik korunur | Composer içinde `--danger-bg` bant: "Gönderin paylaşılamadı. Bağlantını kontrol edip tekrar dene." + [Tekrar dene] |
| 429 hız sınırı | Etkin | Korunur | "Çok sık paylaşım yapıyorsun. Biraz bekleyip tekrar dene." |
| 401 oturum düştü | Etkin | Korunur, taslak kaydedilir | "Oturumunun süresi doldu. Tekrar giriş yap, taslağın saklandı." + [Giriş yap] |
| 403 kısıtlı hesap | Devre dışı | Korunur | "Hesabın şu anda gönderi paylaşamıyor. Ayrıntılar bildirimlerinde." |
| 422 doğrulama | Etkin | Korunur | Sunucudan gelen alan hatası, i18n anahtarıyla (teknik detay yok) |

- Gönderi oluşturma **optimistic değil** (moderasyon ve link önizleme sunucuda çözülüyor).
  Beğeni ve takip optimistic.
- Hata bandı `role="alert"`. Toast `role="status"`.

**Kabul kriterleri**
- `[SND-01]` Yalnızca boşluk ve satır sonu içeren editörde Paylaş `aria-disabled="true"` olur.
- `[SND-02]` Gönderme sırasında (route 2 sn geciktirilir) buton "Paylaşılıyor" metnini ve
  `aria-busy="true"` taşır. İkinci tıklama ikinci istek **göndermez** (istek sayısı = 1).
- `[SND-03]` Başarıda "Gönderin paylaşıldı." toast'ı görünür, editör boşalır, yeni gönderi
  akıştaki ilk `article`'dır.
- `[SND-04]` Route 500 dönünce `role="alert"` içinde "Gönderin paylaşılamadı." görünür,
  editör metni aynen korunur. "Tekrar dene" yeni istek atar.
- `[SND-05]` Route 429 dönünce hız sınırı metni görünür.
- `[SND-06]` Route 401 dönünce taslak localStorage'a yazılmıştır ve "Giriş yap" butonu görünür.
- `[SND-07]` `post-dialog` başarıyla gönderilince dialog kapanır ve odak "Gönderi paylaş"
  butonuna döner.

### 1.8 Taslak koruma

- Anahtar: `bz:draft:{uid}:post` ve `bz:draft:{uid}:comment:{postId}` (localStorage).
  Yalnızca cihazda tutulur, sunucuya gönderilmez.
- Kaydedilenler: metin (entity bilgisiyle 🏗), duyarlılık, sponsorluk anahtarı, kaldırılan
  link önizlemesi bayrağı, `hadMedia` bayrağı. Medya dosyası kaydedilmez.
- Kaydetme: Son tuştan 500ms sonra ve `visibilitychange: hidden` olduğunda anında.
  Ömrü 7 gün. **Çıkış yapınca tüm taslaklar silinir** (paylaşılan cihaz gizliliği).
- Geri yükleme: Composer açılınca taslak varsa içerik yüklenir ve editörün altında bilgi
  satırı görünür: "Kaydedilmemiş taslağın geri yüklendi." + [Taslağı sil]. `hadMedia`
  varsa satıra "Görseli yeniden eklemen gerekiyor." eklenir.
- Kapatma (dialog/sheet, içerik varken): `AlertDialog` "Taslak kaydedilsin mi?" /
  "Bu gönderiyi daha sonra tamamlayabilirsin." [Taslağı kaydet] [Sil]. `Esc` editöre
  döner. Mobilde geri hareketi de aynı soruyu açar.
- `post-inline` ve `comment` sessizce otomatik kaydeder, soru sormaz.
- Gönderme ya da yükleme sürerken sekme kapatılırsa tarayıcının yerel `beforeunload`
  uyarısı çıkar.

**Kabul kriterleri**
- `[DRF-01]` Metin yazılıp 600ms beklenince `bz:draft:{uid}:post` anahtarında metin bulunur.
- `[DRF-02]` Sayfa yenilenip composer açılınca metin geri gelir ve "Kaydedilmemiş taslağın
  geri yüklendi." görünür. "Taslağı sil" editörü boşaltır ve anahtarı siler.
- `[DRF-03]` İçerik varken dialog kapatılmaya çalışılınca "Taslak kaydedilsin mi?" alertdialog'u
  açılır. "Sil" seçilince anahtar silinir, dialog kapanır.
- `[DRF-04]` Çıkış yapılınca `bz:draft:` önekli hiçbir anahtar kalmaz.
- `[DRF-05]` Başarılı gönderiden sonra ilgili taslak anahtarı silinir.
- `[DRF-06]` Yorum taslağı gönderiye özeldir: A gönderisinde yazılan yorum B gönderisinde
  görünmez.

### 1.9 Auth durumları

| Auth | Composer alanı |
|------|----------------|
| `unknown` | Kapalı composer ile aynı ölçüde skeleton (avatar dairesi + çubuk). **"Giriş yap" yok.** |
| `anonymous` | Composer yerine kart: "Fikrini paylaşmak için giriş yap." [Giriş yap] [Kayıt ol]. Yorumda: "Yanıt yazmak için giriş yap." |
| `authenticated` | Composer |

- `[AUTH-01]` Auth çözümü 3 sn geciktirildiğinde (Firebase mock) ilk 3 saniye boyunca
  sayfada "Giriş yap" metni **hiçbir an** bulunmaz. Composer skeleton'ı görünür.
- `[AUTH-02]` Skeleton ile çözülmüş composer arasında layout kayması 0.01 CLS'nin altında.
- `[AUTH-03]` Anonim kullanıcıda `textbox` "Gönderi yaz" yoktur, "Fikrini paylaşmak için giriş
  yap." görünür.

---

## 2. Autocomplete

### 2.1 Tetikleyiciler

Token yalnızca **kelime başında** başlar: satır başı, boşluk ya da `( [ { " ' “ ‘`
karakterlerinden sonra. Böylece `ornek@mail.com`, `site.com/#bolum` ve `5$` tetiklemez.
URL içinde tetiklenmez.

| Tür | Tetikleyici | Sorgu karakterleri | Örnek tetiklemez |
|-----|-------------|---------------------|------------------|
| Cashtag | `$` + harf | `\p{L}[\p{L}\p{N}.]{0,19}` (şirket adıyla arama için Türkçe harf serbest) | `$5`, `$ ` |
| Hashtag | `#` | `[\p{L}\p{N}_]{0,50}`, en az bir harf içermeli ki etiket sayılsın | `#1` (yalnızca rakam) |
| Mention | `@` | `[A-Za-z0-9_]{0,20}` 🏗 kullanıcı adı kuralına göre | `a@b` |

- Tetikleyici yazıldığı anda (0 karakter sorgu) liste açılır ve **varsayılan öneriler**
  gösterilir:
  - `$`: "Takip ettiğin hisseler", yoksa "Çok konuşulanlar" (son 24 saat, nötr ölçüt).
  - `#`: "Son 24 saatte çok kullanılanlar".
  - `@`: "Takip ettiklerin" (son etkileşime göre).
- Liste şu durumlarda kapanır: token'ı bitiren karakter (boşluk, noktalama, satır sonu),
  `Esc`, imlecin token dışına çıkması, editörün odağı kaybetmesi. `Esc` ile kapatılan
  liste, aynı token'a yeni karakter yazılana kadar yeniden açılmaz.
- **IME / kompozisyon** (`compositionstart`–`compositionend`) sırasında tuşlar yakalanmaz,
  ama liste **açık kalır ve sorguyla güncellenir**: Android Gboard her kelimeyi kompozisyon
  olarak yazar, liste gizlenirse mobilde hiç görünmez (`[AC-24]`). Gboard `keydown` kodu
  göndermediği için tespit `input` olayları üzerinden yapılır.

### 2.2 Veri, eşleşme ve sıralama

**Türkçe katlama (folding):** Eşleşme büyük/küçük harf ve Türkçe aksan duyarsız. Katlama
`İ I ı i → i`, `Ş ş → s`, `Ğ ğ → g`, `Ü ü → u`, `Ö ö → o`, `Ç ç → c`. Hem sorgu hem
aday katlanır. **Eklenen metin her zaman verideki kanonik değerdir**, kullanıcının yazdığı
metin büyük harfe çevrilmez. `"$isctr".toLocaleUpperCase('tr-TR')` → `"$İSCTR"` olur ve
hatalıdır, kanonik değer `ISCTR`.

**Cashtag** (🏗 hisse listesi ~600 kayıt, istemcide indekslenebilir, ağ beklemeden < 50ms):
1. Kod tam eşleşme
2. Kod önek eşleşmesi
3. Şirket adında kelime-başı eşleşme ("türk" → THYAO, TTKOM)
4. Kod içinde geçen
5. Şirket adında geçen

Eşitlikte sırasıyla: kullanıcının takip ettiği hisse → 7 günlük bahis sayısı →
`localeCompare(a, b, 'tr')`. En fazla 6 sonuç.

**Hashtag** (sunucu, debounce 150ms): tam → önek → içerir. Eşitlikte 30 günlük kullanım
sayısı. En fazla 6 sonuç. Hiç eşleşme yoksa liste boş durum gösterir (yeni etiket serbestçe
yazılabilir). 🏗 Etiket kanonik anahtarı katlanmış biçim olmalı (`#BİST100` = `#bist100`),
gösterimde yazarın yazdığı biçim korunur.

**Mention** (sunucu, debounce 150ms): kullanıcı adı tam → takip edilenlerde kullanıcı adı
öneki → diğerlerinde kullanıcı adı öneki → görünen ad kelime-başı. Eşitlikte son etkileşim,
sonra takipçi sayısı. En fazla 6 sonuç. 🔒 Oturumdaki kullanıcıyı engelleyen ya da onun
engellediği hesaplar ve askıya alınmış hesaplar listelenmez. **E-posta hiçbir koşulda
gösterilmez** (⚖️ kırmızı çizgi).

### 2.3 Öğe görünümü

Liste: `--bg-elevated`, 1px `--border`, `radius-lg`, `shadow-md`, genişlik 320 (md+),
öğe yüksekliği 48 (md+) / 56 (mobil), iç boşluk 8/12. Aktif öğe: `--bg-muted` zemin +
3px sol kenar `--accent` (renk dışı ipucu).

```
Cashtag                                         Hashtag
┌──────────────────────────────────────────┐   ┌──────────────────────────────────┐
│ Hisseler                                 │   │ Etiketler                        │
│▌[TH] THYAO  Türk Hava Yolları A.O.  BIST │   │▌#bist100          12.345 gönderi │
│ [TU] TUPRS  Tüpraş-Türkiye Petrol…  BIST │   │ #bist30              800 gönderi │
│ [₿]  BTC    Bitcoin               Kripto │   └──────────────────────────────────┘
└──────────────────────────────────────────┘
Mention
┌──────────────────────────────────────────┐
│ Kişiler                                  │
│▌(●) Ayşe Kaya          Takip ediyorsun   │
│     @aysek                               │
│ (●) Ayşegül Demir                        │
│     @aysegul                             │
└──────────────────────────────────────────┘
```
- **Cashtag:** 24px logo (yoksa iki harfli monogram, `--bg-muted` zemin), kod `text-sm`
  semibold `tabular-nums` `--fg`, şirket adı `text-sm` `--fg-muted` tek satır kısaltmalı,
  sağda pazar rozeti `text-xs` (`stock` → "BIST", `crypto` → "Kripto", `other` → "Diğer").
  🏗 "Yıldız Pazar / Ana Pazar" bilgisi veri modelinde yok, açık soru.
  Fiyat **gösterilmez** (v1 fiyatsız).
- **Hashtag:** `#etiket` `text-sm` medium, sağda `{count} gönderi` `text-xs` `--fg-subtle`
  `tabular-nums`. Sayı `Intl.NumberFormat('tr-TR')`, ≥ 10.000 ise kısaltmalı (`12,3 B`),
  tam değer `title`'da.
- **Mention:** 32px avatar, görünen ad `text-sm` semibold, altında `@kullanıcı` `text-xs`
  `--fg-subtle`, takip ediliyorsa sağda "Takip ediyorsun" `text-xs`.
- Eşleşen kısım **kalın** gösterilir (`<mark>` yerine `font-weight: 600`, renk değişmez).
- Liste başlığı (`Hisseler` / `Etiketler` / `Kişiler`) `text-xs` `--fg-subtle`, `role="presentation"`.

### 2.4 Klavye

| Tuş | Davranış |
|-----|----------|
| `↓` / `↑` | Sonraki/önceki öğe. Uçlarda döner. Liste açıkken editör imleci hareket etmez. |
| `Enter` / `Tab` | Aktif öğeyi ekler. Aktif öğe yoksa (boş liste) Enter normal satır sonu, Tab normal odak geçişi yapar. |
| `Esc` | Listeyi kapatır, metin aynen kalır. |
| `Space` ya da noktalama | Listeyi kapatır. Cashtag sorgusu bir kodla **tam** eşleşiyorsa token o hisseye çözülür (`$thyao ` → `$THYAO`). |
| `Home` / `End`, `←` / `→` | Editörde kalır. İmleç token dışına çıkarsa liste kapanır. |
| Fare üzeri | Aktif öğeyi değiştirir. Tıklama ekler, editör odağı korunur. |

- Liste açıldığında **ilk öğe aktif** olur (Enter tek dokunuşla seçer).
- Ekleme: Token, kanonik değer + **tek boşluk** ile değiştirilir, imleç boşluğun sonrasına
  gelir. Boşluk zaten varsa ikinci boşluk eklenmez.

### 2.5 ARIA (WAI-ARIA 1.2 combobox, çok satırlı metin alanı varyantı)

```
<div role="textbox" aria-multiline="true" contenteditable
     aria-label="Gönderi yaz"
     aria-autocomplete="list"
     aria-haspopup="listbox"
     aria-controls="ac-listbox"             ← yalnızca liste açıkken
     aria-activedescendant="ac-opt-THYAO"   ← yalnızca liste açıkken
     aria-describedby="composer-counter composer-disclaimer">
<div id="ac-listbox" role="listbox" aria-label="Hisse önerileri">
  <div role="option" id="ac-opt-THYAO" aria-selected="true">…</div>
```
- `aria-expanded` **yok**: ARIA 1.2'de `textbox` rolünde izinli değil (axe `aria-allowed-attr`,
  `[AC-23]`); `combobox` rolü ise çok satırlı olamaz. Listenin açık olduğu `aria-controls`'un
  varlığı (ve test için `data-ac-open="true"`) ile bildirilir; kapalıyken `aria-controls` ve
  `aria-activedescendant` kaldırılır.
- Odak **her zaman editörde** kalır. Aktif öğe `aria-activedescendant` ile bildirilir.
- Listbox etiketi türe göre "Hisse önerileri" / "Etiket önerileri" / "Kişi önerileri".
- Option'ın erişilebilir adı tüm satırdır: "THYAO, Türk Hava Yolları A.O., BIST",
  "#bist100, 12.345 gönderi", "Ayşe Kaya, @aysek, takip ediyorsun".
- Ayrı bir `aria-live="polite"` bölgesi, liste açılınca ya da sonuç sayısı değişince
  (debounce 500ms) duyuru yapar: "6 öneri. Yukarı ve aşağı oklarla gezin, Enter ile seç."
  Sonuç yoksa "Sonuç yok." Yükleniyorsa duyuru yok.
- Logo ve avatar dekoratif: `alt=""`.

### 2.6 Konumlandırma ve mobil

- **md+:** Popover imlecin (caret rect) altında, sol kenarı token'ın başına hizalı.
  Altta yer yoksa üstte açılır (Radix/Floating UI `flip`, `shift`). Dialog içinde de
  `--z-popover` ile üstte kalır. Maksimum görünür yükseklik 6 öğe, iç kaydırma.
- **< md:** Popover imlece bağlı **değil**. Liste, composer'ın alt bölgesinde
  (duyarlılık/sponsorluk/uyarı satırlarının yerine) **klavyenin hemen üstüne yapışık tam
  genişlikte panel** olarak açılır. Görünür yükseklik en fazla 4 öğe + yarım öğe (kaydırma
  ipucu) = 252px. Toolbar panelin altında kalır. Gerekçe: Küçük ekranda imlece bağlı
  popover klavyenin altında kalır ya da metni örter.
  - Dokunma: Öğeye dokunma ekler. Kaydırma hareketi seçim yapmaz (pointerup'ta 10px'ten
    az hareket şartı).
  - Panel açılınca editör içeriği, aktif token görünür kalacak şekilde kaydırılır.
- Liste açılırken animasyon: 120ms opacity. Reduced motion'da yok.

### 2.7 Durumlar

| Durum | Görünüm | Metin (tr) |
|-------|---------|------------|
| Loading (ilk) | 300ms sonra 3 skeleton satır, liste yüksekliği sabit | (yok, SR'ye duyuru yok) |
| Loading (sorgu değişti) | Önceki sonuçlar kalır, liste üst kenarında 2px belirsiz ilerleme çubuğu | (yok) |
| Empty: cashtag | ikon + metin, seçilebilir öğe yok | `"{query}" ile eşleşen hisse yok.` |
| Empty: hashtag | metin | `"#{query}" henüz kullanılmamış. Yazmaya devam edebilirsin.` |
| Empty: mention | metin | `"@{query}" ile eşleşen kişi yok.` |
| Empty: varsayılan `$` (takip yok, çok konuşulan da yok) | metin | `Hisse kodu ya da şirket adı yaz.` |
| Error | metin + `role="option"` olan "Tekrar dene" (klavyeyle seçilebilir) | `Öneriler yüklenemedi. Tekrar dene` |
| Offline | Cashtag yerel indeksten çalışır. Diğerleri error durumuna düşer. | |

Yazma hiçbir durumda engellenmez. Autocomplete yalnızca yardımcı bir araç.

### 2.8 Kabul kriterleri (autocomplete)

- `[AC-01]` Boş editöre `$` yazılınca `listbox` "Hisse önerileri" açılır, editörün
  `aria-controls` değeri bu listbox'ın id'sidir ve takip edilen hisseler listelenir.
- `[AC-02]` `$th` yazılınca ilk öğe THYAO'dur ve `aria-selected="true"` taşır. Editörün
  `aria-activedescendant` değeri bu öğenin id'sidir.
- `[AC-03]` `$türk` yazılınca THYAO ve TTKOM listelenir, THYAO önce gelir (bahis sayısı).
- `[AC-04]` `$sise` ve `$şişe` aynı ilk sonucu (SISE) verir.
- `[AC-05]` `$isctr` yazılıp Enter'a basılınca editör metni `$ISCTR ` olur (`İ` yok).
- `[AC-06]` `$thyao` + boşluk yazılınca token THYAO'ya çözülür (entity stili uygulanır),
  liste kapanır.
- `[AC-07]` `$5` yazılınca liste açılmaz. `mail@ornek.com` yazılınca liste açılmaz.
  `site.com/#a` yazılınca liste açılmaz.
- `[AC-08]` `↓` iki kez, `↑` bir kez basılınca ikinci öğe aktiftir. Son öğede `↓` ilk öğeye döner.
- `[AC-09]` `Esc` listeyi kapatır, editör metni değişmez; editörde `aria-controls` ve
  `aria-activedescendant` kalmaz. Aynı token'a bir karakter daha yazılınca liste yeniden açılır.
- `[AC-10]` Liste açıkken `Enter` satır sonu eklemez. Boş liste durumunda `Enter` satır sonu ekler.
- `[AC-11]` `#bi` yazılınca `#bist100` ilk sıradadır ve satırda "12.345 gönderi" metni vardır.
- `[AC-12]` `@ay` yazılınca `aysek` (takip edilen) `aysegul`'den önce gelir. Satırda
  "Takip ediyorsun" vardır.
- `[AC-13]` `@eng` yazılınca `engelli` kullanıcısı listede yoktur.
- `[AC-14]` Hiçbir öneri satırında `@` işaretli e-posta biçimli metin yoktur
  (regex `/\S+@\S+\.\S+/`).
- `[AC-15]` Mention API'si 1 sn geciktirilince 300ms sonra 3 skeleton satırı görünür.
  200ms'de dönen yanıtta skeleton hiç görünmez.
- `[AC-16]` Mention API'si 500 dönünce "Öneriler yüklenemedi." ve `role="option"`
  "Tekrar dene" görünür. Enter ile yeniden istek atılır.
- `[AC-17]` `$zzzz` yazılınca `"zzzz" ile eşleşen hisse yok.` görünür ve listede seçilebilir
  option yoktur.
- `[AC-18]` Live region, liste açıldıktan sonra "öneri" kelimesini ve sonuç sayısını içerir.
- `[AC-19]` 375px viewport'ta `$` yazılınca listbox'ın genişliği viewport genişliğine eşittir
  (±1px) ve alt kenarı toolbar'ın üst kenarına bitişiktir.
- `[AC-20]` md+ genişlikte listbox'ın sol kenarı, `$` karakterinin caret rect'inin sol
  kenarından en fazla 8px uzaktadır.
- `[AC-21]` Öğeye fare ile tıklanınca öğe eklenir ve editör odakta kalır
  (`document.activeElement` editördür).
- `[AC-22]` Ekleme sonrası çift boşluk oluşmaz: `$th| dedi` metninde THYAO seçilince
  sonuç `$THYAO dedi` olur.
- `[AC-23]` axe-core taramasında açık listbox ile `aria-*` ihlali yoktur.
- `[AC-24]` IME kompozisyonu sürerken (`$t` → `$th`, Android Gboard) liste görünür kalır ve
  sorguyla güncellenir; kompozisyon commit edilince metin değişmez.

---

## 3. Entity stilleri

Ortak ilke: Dört tür de `--accent` rengini kullanır. Renk çevre metne karşı yalnızca
~2.2:1 kontrast verdiği için (bkz. design-system §2.2) **her türün renk dışı bir ipucu
vardır**.

### 3.1 Editörde (yazarken)

Editörde yazı ağırlığı **değişmez**. Yazarken kalınlaşan metin satırı kaydırır ve imleç
zıplar. Ayrım renk ve zeminle yapılır.

| Durum | Görünüm |
|-------|---------|
| Aktif sorgu (liste açık, henüz çözülmedi) | `--accent` metin + 1px noktalı alt çizgi `--accent` |
| Çözülmüş cashtag | `--accent` metin, `--accent-subtle` zemin, `radius-sm`, yatay 2px dolgu (`box-decoration-break: clone`) |
| Çözülmüş mention | Cashtag ile aynı |
| Hashtag (geçerli biçim) | Cashtag ile aynı (hashtag her zaman "çözülmüş" sayılır) |
| Çözülmemiş cashtag/mention (eşleşme yok) | Normal `--fg` metin, stil yok. Yayında da düz metin olur. |
| URL | `--accent` metin + alt çizgi. Editörde **kısaltılmaz** (yazar tam adresi görmeli). |
| Sınırı aşan bölüm | `--danger-bg` zemin (entity stilinin üzerine) |

- Entity'ler **metin tabanlıdır, atomik chip değildir**. Backspace tek karakter siler ve
  token yeniden sorgu durumuna geçer (liste açılır). Gerekçe: IME ve mobil klavyelerle
  uyumlu, öngörülebilir. 🏗 Editör bunu dekorasyonla sağlamalı.
- `[ENT-E01]` `$THYAO` seçildikten sonra token öğesinin hesaplanan `background-color`
  değeri `--accent-subtle`, `font-weight` değeri çevre metinle aynıdır.
- `[ENT-E02]` Çözülmüş `$THYAO` sonunda Backspace'e basılınca metin `$THYA` olur ve liste açılır.
- `[ENT-E03]` `$ZZZZ ` (eşleşmesiz) yazılınca token'a entity stili uygulanmaz.
- `[ENT-E04]` Editördeki `https://www.kap.org.tr/tr/Bildirim/1234567` metni tam haliyle görünür.

### 3.2 Render'da (gönderi ve yorum)

| Tür | Görünüm | Hover / focus | Tıklama | Erişilebilir ad |
|-----|---------|---------------|---------|-----------------|
| **Cashtag** `$THYAO` | `--accent`, semibold, `tabular-nums`, `--accent-subtle` zemin, `radius-sm`, yatay 2px dolgu | Zemin `--bg-muted`'a, alt çizgi. md+ pointer'da hover kartı (§4.1) | `/hisse/THYAO` (🏗 rota) | "$THYAO, Türk Hava Yolları A.O." (görünen metin başta, WCAG 2.5.3) |
| **Hashtag** `#bist100` | `--accent`, semibold, zemin yok | Alt çizgi | `/etiket/bist100` | "#bist100" |
| **Mention** `@aysek` | `--accent`, semibold, zemin yok | Alt çizgi. md+ pointer'da kullanıcı kartı (§4.2) | `/u/aysek` | "@aysek, Ayşe Kaya" |
| **URL** | `--accent`, **normal** ağırlık, her zaman alt çizgi (1px, offset 2), sonda 12px `ArrowUpRight` (`aria-hidden`). Kısaltılmış metin (§5). | Alt çizgi 2px. Tooltip'te tam URL (500ms). | Yeni sekme (dış link), aynı sekme (iç link, ↗ yok) | Görünen metin + gizli "(yeni sekmede açılır)" |

- Tüm entity'ler gerçek `<a href>` öğesidir (eski koddaki `span onClick` +
  `window.open` kalkıyor). Orta tık ve "yeni sekmede aç" çalışır. Kart tıklamasına
  yayılmaz.
- Dokunma hedefi: Satır içi linkler WCAG 2.5.8 satır içi istisnasındadır. Yine de dikey
  dolgu pseudo-element ile 32px'e genişletilir.
- Cashtag'i hashtag'den ayıran ipucu zemin chip'idir. Hashtag ve mention önek karakteri
  ve semibold ağırlıkla ayrılır. URL'ler alt çizgi ve ↗ ile ayrılır.
- Silinmiş ya da askıya alınmış kullanıcıya mention ve listeden çıkmış hisseye cashtag:
  düz `--fg` metin, link yok.
- 🔒 Yalnızca `http`/`https` şemaları linklenir. `javascript:`, `data:` ve diğerleri düz
  metin olur. Dış linkler `rel="noopener noreferrer nofollow ugc"` taşır. Karışık alfabeli
  (homograf) alan adları punycode olarak gösterilir.
- Gönderi metni akışta 6 satırla sınırlıdır, ardından "Devamını gör" butonu gelir. Detayda
  sınır yoktur.

**Kabul kriterleri**
- `[ENT-R01]` `$THYAO` içeren gönderide `link` "$THYAO, Türk Hava Yolları A.O."
  `href="/hisse/THYAO"` ile bulunur. Hesaplanan `font-weight` ≥ 600, zemin `--accent-subtle`.
- `[ENT-R02]` `#bist100` linki `/etiket/bist100`'e gider. Zemin `transparent`, ağırlık ≥ 600.
- `[ENT-R03]` `@aysek` linki `/u/aysek`'e gider. Erişilebilir adı "Ayşe Kaya" içerir.
- `[ENT-R04]` Dış URL `target="_blank"` ve `rel` içinde `noopener`, `noreferrer`, `nofollow`,
  `ugc` taşır. Hesaplanan `text-decoration-line` `underline`.
- `[ENT-R05]` Gönderi kartındaki cashtag linkine tıklanınca hisse sayfasına gidilir,
  gönderi detayına **gidilmez**.
- `[ENT-R06]` `javascript:alert(1)` metni link olarak render edilmez.
- `[ENT-R07]` Silinmiş kullanıcıya mention düz metindir (`link` rolü yok).
- `[ENT-R08]` Klavyeyle Tab'la entity'ler sırayla odaklanır ve focus ring görünür
  (outline ≥ 2px).
- `[ENT-R09]` Açık ve koyu temada axe-core `color-contrast` ve `link-in-text-block` ihlali yok.

---

## 4. Hover kartları

Radix `HoverCard`. Açılma gecikmesi 400ms, kapanma 200ms. **Yalnızca `(hover: hover)` ve
`(pointer: fine)` cihazlarda** açılır. Dokunmatik cihazda dokunma doğrudan sayfaya gider.
Kart ek bilgi verir. İçindeki her bilgi ve aksiyon hedef sayfada da bulunur, bu yüzden
klavye kullanıcısı bir şey kaybetmez (link'in erişilebilir adı şirket adını zaten
içeriyor).

### 4.1 Hisse kartı (cashtag)

```
┌────────────────────────────────────────┐  320px, --bg-elevated, radius-lg, shadow-md
│ [logo40]  THYAO                [Takip et]│  kod text-md semibold tabular
│           Türk Hava Yolları A.O.        │  text-sm fg-muted
│           BIST · Pay                    │  text-xs fg-subtle
│                                         │
│ Son 24 saatte 214 gönderi               │  text-xs fg-subtle, nötr ölçüt
│                                         │
│ Hisse sayfası   KAP ↗   TradingView ↗   │  text-sm accent linkler
│ ─────────────────────────────────────── │
│ <legal.disclaimer.short ⚖️>             │  text-xs fg-subtle
└────────────────────────────────────────┘
```
- Fiyat ve grafik yok (v1, lisans). Gelecekte fiyat eklenirse "15 dk gecikmeli · Kaynak"
  etiketi zorunlu.
- "Takip et" butonu auth'a bağlı. `unknown` → buton boyutunda skeleton. `anonymous` →
  "Takip et" giriş sheet'ini açar. Takip optimistic, hata olursa geri alınır ve toast çıkar.
- Loading: Ad ve kod yerel hisse indeksinden anında gelir. Sayaç ve takip durumu için
  satır içi skeleton kullanılır. Kart boyutu değişmez.
- Error: Sayaç satırı gizlenir, kartın geri kalanı çalışır.

### 4.2 Kullanıcı kartı (mention)
Avatar 48, ad, @kullanıcı, bio (2 satır), `{n} takipçi · {m} takip` (`tabular-nums`),
[Takip et]. Auth ve hata kuralları hisse kartıyla aynı. Engellenmiş ilişkide kart açılmaz.

**Kabul kriterleri**
- `[HC-01]` Masaüstünde `$THYAO` üzerinde 500ms beklenince "Türk Hava Yolları A.O.",
  "KAP" ve "TradingView" metinli kart görünür. 300ms'de henüz görünmez.
- `[HC-02]` `hasTouch: true, isMobile: true` bağlamında cashtag'e dokunmak kart açmadan
  `/hisse/THYAO`'ya gider.
- `[HC-03]` Kartta `legal.disclaimer.short` metni bulunur.
- `[HC-04]` Kartta fiyat biçimli metin (`/₺|%\d/`) yoktur.
- `[HC-05]` Auth `unknown` iken kartta "Takip et" metni yoktur, skeleton vardır.
- `[HC-06]` KAP ve TradingView linkleri `target="_blank"` ve `rel="noopener noreferrer"` taşır.
- `[HC-07]` Sayaç API'si 500 dönünce kart yine açılır, "gönderi" sayaç satırı yoktur.

---

## 5. URL kısaltma kuralları

1. `http://`, `https://` ve baştaki `www.` kaldırılır.
2. Kalan metin ≤ 32 karakterse aynen gösterilir.
3. Uzunsa `host + path` ilk 31 karaktere kesilir ve `…` eklenir. Query ve fragment
   kesildiğinde gösterilmez. Host hiçbir zaman ortadan kesilmez. Host tek başına
   32 karakteri aşıyorsa hostun ilk 31 karakteri + `…` gösterilir.
4. Sondaki noktalama (`. , ! ? ; : ) ”`) URL'ye dahil edilmez (`bak https://x.com/a.` →
   nokta metinde kalır). Dengeli parantez korunur (`…/Foo_(bar)`).
5. v1'de yalnızca `http(s)://` ya da `www.` ile başlayan metin linklenir. Protokolsüz
   `kap.org.tr` linklenmez (🏗 açık soru: yanlış pozitif riski, ör. "A.Ş").
6. Tam URL, `title` ve tooltip'te görünür.

| Girdi | Görünen |
|-------|---------|
| `https://www.kap.org.tr/tr/Bildirim/1234567` | `kap.org.tr/tr/Bildirim/1234567` (30) |
| `https://www.borsaistanbul.com/tr/sayfa/2367/endeks-bilgileri?x=1` | `borsaistanbul.com/tr/sayfa/2367…` |
| `http://example.com/` | `example.com` (sondaki `/` atılır) |

- `[URL-01]` Yukarıdaki tablo birebir doğrulanır (birim test + render testi).
- `[URL-02]` Linkin `href` niteliği her zaman tam ve orijinal URL'dir.
- `[URL-03]` `bak https://x.com/a.` metninde linkin `href` değeri `https://x.com/a`.

---

## 6. Link önizleme kartı

- Gönderideki **ilk dış URL** için gösterilir. Gönderide görsel/GIF varsa önizleme
  gösterilmez (medya öncelikli). İç linkler (borsaliyorum) önizleme almaz.
- 🏗🔒 Öneri: Önizleme verisi (başlık, açıklama, görsel, site adı) gönderi oluşturulurken
  sunucuda **bir kez** çekilir ve gönderiyle saklanır. Render sırasında fetch yapılmaz
  (CLS yok, her görüntülemede SSRF yüzeyi yok). Görseller kendi proxy/depomuzdan sunulur
  (⚖️ okuyucunun IP'si üçüncü tarafa gitmez).

**Varyantlar**
```
Büyük (og:image genişliği ≥ 600)           Kompakt (küçük ya da kare görsel)
┌──────────────────────────────────┐       ┌──────────────────────────────────────┐
│ [görsel 1.91:1, object-cover]    │       │ [88×88] kap.org.tr                   │
├──────────────────────────────────┤       │         THYAO Özel Durum Açıklaması… │
│ 🌐 kap.org.tr                     │       │         Şirketimizin 2026 yılı 3. ç… │
│ THYAO Özel Durum Açıklaması (Gene│       └──────────────────────────────────────┘
│ l) başlığı iki satıra kadar…     │        Görselsiz: thumbnail yerine favicon
│ Açıklama iki satır, fg-muted…    │        ve yalnızca metin
└──────────────────────────────────┘
```
- Kabuk: Tümü tek bir `<a>`, 1px `--border`, `radius-lg`, overflow hidden. Hover'da
  `--bg-muted` zemin.
- Site satırı: 16px favicon + host, `text-xs` `--fg-subtle`. Başlık `text-sm` semibold
  `--fg`, en fazla 2 satır. Açıklama `text-sm` `--fg-muted`, en fazla 2 satır, kompaktta
  < sm genişlikte gizli.
- Görsel `alt=""` (dekoratif, linkin adı başlıktan geliyor). Erişilebilir ad:
  "{başlık}, {host}" + "(yeni sekmede açılır)".
- Ölçüler sabit: Büyük kartın görseli `aspect-ratio: 1.91`, kompakt kart 88px yükseklik.
  Yer önceden rezerve edilir.
- Başlık yoksa kart gösterilmez, URL yalnızca satır içi link olarak kalır.

**Composer'da**
- URL tamamlandığında (ardından boşluk/satır sonu geldiğinde ya da 600ms boşta kalınca)
  önizleme çekilir. Bekleme sırasında kompakt kart boyutunda skeleton gösterilir.
- Sağ üstte "Önizlemeyi kaldır" (X, 44px hedef). Kaldırılan önizleme bu gönderi için tekrar
  gelmez, ikinci URL'ye de geçilmez.
- Çekme hatası ya da meta verinin olmaması durumunda sessizce önizleme yok (hata mesajı
  gösterilmez). Gönderi engellenmez.
- Görsel eklenince önizleme gizlenir. Görsel kaldırılınca önizleme geri gelir (kaldırılmamışsa).

**Kabul kriterleri**
- `[LPV-01]` Composer'a `https://ornek.com/haber ` yazılınca önce skeleton, ardından başlıklı
  önizleme kartı görünür (route mock).
- `[LPV-02]` "Önizlemeyi kaldır" sonrası kart kaybolur. Gönderilen gönderide kart yoktur.
- `[LPV-03]` Önizleme API'si 500 dönünce composer'da hata metni görünmez ve Paylaş etkin kalır.
- `[LPV-04]` Görsel ve URL içeren gönderide önizleme kartı render edilmez.
- `[LPV-05]` Akışta önizlemeli gönderi yüklenirken ölçülen CLS < 0.01. Render sırasında
  önizleme için ağ isteği atılmaz.
- `[LPV-06]` Kartın tamamı tek bir `link`'tir. Erişilebilir adı başlığı ve hostu içerir.
- `[LPV-07]` Kartın `img` kaynağı uygulamanın kendi origin'indendir (üçüncü taraf host değil).

---

## 7. Erişilebilirlik özeti (composer + entity)

- Editör: `role="textbox"`, `aria-multiline="true"`, `aria-label` (görünen placeholder
  etiket yerine geçmez), `aria-describedby` → sayaç ve uyarı.
- Toolbar: `role="toolbar"` `aria-label="Gönderi araçları"`. Ok tuşlarıyla gezilir, tek
  tab durağıdır. Tüm ikon butonların i18n `aria-label`'ı var.
- Odak sırası (dialog): editör → medya kontrolleri → duyarlılık → sponsorluk → toolbar →
  Paylaş → uyarı linki → kapat. Dialog odak tuzağı Radix'ten gelir.
- Renk dışı ipuçları: entity'ler (§3), duyarlılık (glif + metin), sayaç (sayı + renk),
  aktif öneri (sol kenar çubuğu + zemin).
- Ekran okuyucu duyuruları: autocomplete sonuç sayısı, sayaç eşikleri, gönderme sonucu
  (toast `status`, hata `alert`).
- `[A11Y-01]` Composer dialog'u açıkken, autocomplete açıkken ve hata bandı görünürken
  axe-core taramasında (wcag2a, wcag2aa, wcag22aa etiketleri) ihlal yoktur. Tarama açık ve
  koyu temada ayrı ayrı yapılır.
- `[A11Y-02]` Composer'daki tüm etkileşimler yalnızca klavyeyle tamamlanabilir: yaz →
  `$th` → Enter → Yükseliş seç → Ctrl+Enter → toast.
- `[A11Y-03]` 320px genişlik ve %200 metin ölçeğinde composer'da yatay kaydırma yoktur.

---

## 8. Metinler (i18n)

Ek ve ünlü uyumu kuralı: Değişken ek almaz (`"{query}" ile`, `Yanıtlanan: @{username}`).

| Anahtar | tr | en |
|---------|----|----|
| `composer.placeholder.post` | Ne düşünüyorsun? | What's on your mind? |
| `composer.placeholder.comment` | Yanıtını yaz | Write a reply |
| `composer.label.post` | Gönderi yaz | Write a post |
| `composer.label.comment` | Yanıt yaz | Write a reply |
| `composer.title` | Yeni gönderi | New post |
| `composer.replyingTo` | Yanıtlanan: @{username} | Replying to @{username} |
| `composer.submit.post` | Paylaş | Post |
| `composer.submit.comment` | Yanıtla | Reply |
| `composer.submitting` | Paylaşılıyor | Posting |
| `composer.disabled.empty` | Bir şeyler yaz | Write something first |
| `composer.disabled.uploading` | Görsel yükleniyor | Image is uploading |
| `composer.toolbar.label` | Gönderi araçları | Post tools |
| `composer.toolbar.image` | Görsel ekle | Add image |
| `composer.toolbar.gif` | GIF ekle | Add GIF |
| `composer.toolbar.cashtag` | Hisse ekle | Add stock |
| `composer.toolbar.hashtag` | Etiket ekle | Add hashtag |
| `composer.toolbar.mention` | Kişi an | Mention someone |
| `composer.media.single` | Tek bir görsel ya da GIF ekleyebilirsin. | You can add one image or GIF. |
| `composer.media.drop` | Görseli buraya bırak | Drop image here |
| `composer.media.remove` | Görseli kaldır | Remove image |
| `composer.media.altAdd` | Açıklama ekle | Add description |
| `composer.media.altEdit` | Açıklamayı düzenle | Edit description |
| `composer.media.altFallback` | Gönderi görseli | Post image |
| `composer.media.tooLarge` | Görsel en fazla {max} MB olabilir. | Images can be up to {max} MB. |
| `composer.media.badType` | Bu dosya türü desteklenmiyor. JPG, PNG ya da WebP yükleyebilirsin. | This file type isn't supported. You can upload JPG, PNG or WebP. |
| `composer.media.uploadFailed` | Yüklenemedi. | Upload failed. |
| `composer.gif.search` | GIF ara | Search GIFs |
| `composer.gif.popular` | Popüler | Popular |
| `composer.gif.empty` | Sonuç bulunamadı. Başka bir kelime dene. | No results. Try another word. |
| `composer.gif.error` | GIF'ler yüklenemedi. | Couldn't load GIFs. |
| `composer.gif.play` | GIF'i oynat | Play GIF |
| `composer.counter.remaining` | Kalan karakter: {n} | Characters left: {n} |
| `composer.counter.over` | Karakter sınırı {n} aşıldı | Over the limit by {n} |
| `composer.sentiment.label` | Görüşün | Your view |
| `composer.sentiment.bullish` | Yükseliş | Bullish |
| `composer.sentiment.bearish` | Düşüş | Bearish |
| `composer.sentiment.neutral` | Nötr | Neutral |
| `composer.sentiment.help` | Seçimin gönderinde küçük bir etiket olarak görünür ve kişisel görüşün olarak gösterilir. | Your choice appears as a small tag on your post, shown as your personal view. |
| `composer.sponsored.label` ⚖️ | Bu içerik bir işbirliği/sponsorluk içeriyor | This post contains a collaboration/sponsorship |
| `composer.sponsored.help` ⚖️ | Açarsan gönderinin başında "Reklam / İşbirliği" etiketi görünür. | If on, a "Sponsored / Collaboration" label appears at the top of your post. |
| `post.sponsoredLabel` ⚖️ | Reklam / İşbirliği | Sponsored / Collaboration |
| `legal.disclaimer.short` ⚖️ | *(legal-advisor'dan)* | *(from legal-advisor)* |
| `legal.disclaimer.more` | Ayrıntılar | Details |
| `composer.success` | Gönderin paylaşıldı. | Your post is live. |
| `composer.success.view` | Görüntüle | View |
| `composer.successComment` | Yanıtın paylaşıldı. | Your reply is live. |
| `composer.error.generic` | Gönderin paylaşılamadı. Bağlantını kontrol edip tekrar dene. | Couldn't share your post. Check your connection and try again. |
| `composer.error.rateLimit` | Çok sık paylaşım yapıyorsun. Biraz bekleyip tekrar dene. | You're posting too often. Wait a bit and try again. |
| `composer.error.session` | Oturumunun süresi doldu. Tekrar giriş yap, taslağın saklandı. | Your session expired. Log in again, your draft is saved. |
| `composer.error.restricted` | Hesabın şu anda gönderi paylaşamıyor. Ayrıntılar bildirimlerinde. | Your account can't post right now. See your notifications for details. |
| `common.retry` | Tekrar dene | Try again |
| `common.login` | Giriş yap | Log in |
| `common.signup` | Kayıt ol | Sign up |
| `composer.draft.restored` | Kaydedilmemiş taslağın geri yüklendi. | Your unsaved draft was restored. |
| `composer.draft.mediaLost` | Görseli yeniden eklemen gerekiyor. | You'll need to add the image again. |
| `composer.draft.discard` | Taslağı sil | Discard draft |
| `composer.draft.confirmTitle` | Taslak kaydedilsin mi? | Save draft? |
| `composer.draft.confirmBody` | Bu gönderiyi daha sonra tamamlayabilirsin. | You can finish this post later. |
| `composer.draft.save` | Taslağı kaydet | Save draft |
| `composer.draft.delete` | Sil | Discard |
| `composer.anon.post` | Fikrini paylaşmak için giriş yap. | Log in to share your thoughts. |
| `composer.anon.comment` | Yanıt yazmak için giriş yap. | Log in to reply. |
| `ac.listbox.stocks` | Hisse önerileri | Stock suggestions |
| `ac.listbox.tags` | Etiket önerileri | Hashtag suggestions |
| `ac.listbox.users` | Kişi önerileri | People suggestions |
| `ac.heading.stocks` | Hisseler | Stocks |
| `ac.heading.followedStocks` | Takip ettiğin hisseler | Stocks you follow |
| `ac.heading.mostMentioned` | Çok konuşulanlar (son 24 saat) | Most mentioned (last 24h) |
| `ac.heading.tags` | Etiketler | Hashtags |
| `ac.heading.trendingTags` | Son 24 saatte çok kullanılanlar | Most used in the last 24h |
| `ac.heading.users` | Kişiler | People |
| `ac.heading.following` | Takip ettiklerin | People you follow |
| `ac.market.stock` | BIST | BIST |
| `ac.market.crypto` | Kripto | Crypto |
| `ac.market.other` | Diğer | Other |
| `ac.tagCount` | {count} gönderi | {count, plural, one {# post} other {# posts}} |
| `ac.following` | Takip ediyorsun | Following |
| `ac.empty.stock` | "{query}" ile eşleşen hisse yok. | No stocks match "{query}". |
| `ac.empty.tag` | "#{query}" henüz kullanılmamış. Yazmaya devam edebilirsin. | "#{query}" hasn't been used yet. Keep typing. |
| `ac.empty.user` | "@{query}" ile eşleşen kişi yok. | No one matches "@{query}". |
| `ac.empty.stockDefault` | Hisse kodu ya da şirket adı yaz. | Type a ticker or company name. |
| `ac.error` | Öneriler yüklenemedi. | Couldn't load suggestions. |
| `ac.sr.count` | {count} öneri. Yukarı ve aşağı oklarla gezin, Enter ile seç. | {count} suggestions. Use up and down arrows, Enter to select. |
| `ac.sr.none` | Sonuç yok. | No results. |
| `entity.newTab` | (yeni sekmede açılır) | (opens in a new tab) |
| `hovercard.stockPage` | Hisse sayfası | Stock page |
| `hovercard.kap` | KAP | KAP |
| `hovercard.tradingview` | TradingView | TradingView |
| `hovercard.mentions24h` | Son 24 saatte {count} gönderi | {count} posts in the last 24h |
| `hovercard.follow` | Takip et | Follow |
| `hovercard.following` | Takip ediliyor | Following |
| `hovercard.followers` | {n} takipçi · {m} takip | {n} followers · {m} following |
| `linkPreview.remove` | Önizlemeyi kaldır | Remove preview |
| `post.readMore` | Devamını gör | Show more |
| `post.readLess` | Daha az göster | Show less |

---

## 9. Açık sorular ve devirler

| # | Soru | Sahibi |
|---|------|--------|
| 1 | Editör teknolojisi metin tabanlı entity dekorasyonu, caret rect ve `aria-activedescendant` destekliyor mu? (Tiptap/ProseMirror, Lexical ya da textarea + overlay) | 🏗 architect |
| 2 | İçerik formatı: düz metin + yazım anında çözülmüş `entities[{type,start,end,refId}]` öneriliyor. Eski `$(THYAO)` işaretlemesi taşınmamalı. Render regex'le çözüm yapmamalı. | 🏗 architect |
| 3 | Gönderi/yorum karakter sınırları (1000/500) ve URL sayım kuralı | 🏗 + ürün |
| 4 | Çoklu görsel (1 yerine 4)? Veri modeli değişikliği gerektirir. | 🏗 + ürün |
| 5 | GIF sağlayıcı (GIPHY/Tenor), sunucu proxy, KVKK yurt dışı aktarım | ⚖️ legal + 🏗 |
| 6 | `legal.disclaimer.short` metni, "Ayrıntılar" hedefi. Yorum composer'ında ve hover kartında gerekli mi? | ⚖️ legal |
| 7 | Sponsorluk anahtarı etiket metni. Yorumlar için de gerekli mi? Sponsorlu **hisse** tanıtımı politika olarak yasaklanacak mı? | ⚖️ legal |
| 8 | Hisse pazar bilgisi (Yıldız/Ana/Alt Pazar) veri modeline eklenecek mi? | 🏗 |
| 9 | Hashtag kanonikleştirme (Türkçe katlama) ve mention kullanıcı adı karakter seti | 🏗 |
| 10 | Protokolsüz alan adlarının (`kap.org.tr`) linklenmesi | 🏗 + ürün |
| 11 | Link önizleme sunucu fetch'i: SSRF, boyut/zaman sınırı, görsel depolama; EXIF temizleme | 🔒 security |
| 12 | Riskli/şikayetli alan adları için dış link uyarı ara sayfası (pump grupları, phishing) | 🔒 + ⚖️ |
