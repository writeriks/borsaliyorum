# Borsalıyorum v2: Design System

> Durum: taslak v0.1 (2026-10-10), sahibi `ui-ux-designer`.
> Token kaynağı: `docs/design/tokens.css`. Kurallar: `.claude/skills/design-system/SKILL.md`.
> Teknik karşılık (Next.js 16, Tailwind, shadcn/ui, editör teknolojisi) `architect`'e ait.
> Bu doküman görsel ve UX kararlarını verir.

---

## 1. Marka yönü

**"Sakin terminal, sıcak sohbet."** Borsalıyorum, piyasayı konuşan insanların buluştuğu
bir **okuma odası** gibi görünmeli. Heyecanlı bir alım satım salonu havası istemiyoruz.
Koyu, dingin bir zemin üzerinde tek bir lacivert-mavi vurgu rengi var. Yeşil ve kırmızı
**yalnızca piyasa yönü** için ayrılmış. Tipografi yoğun ama nefes alan, rakamlar hizalı.
Kimlik gürültüyle değil netlikle kuruluyor: kullanıcı hissesini, etiketini ve kişisini
anında tanır.

İlkeler:
1. **İçerik önde, çerçeve geride.** Kart kenarları ince ve dekoratif, gölgeler minimum.
   Hiyerarşiyi tipografi ve boşluk kuruyor.
2. **Tek vurgu rengi.** Marka, link, birincil buton ve entity'ler (`$`, `#`, `@`, URL)
   aynı `--accent` rengini kullanıyor. Yeşil/kırmızı asla marka ya da CTA rengi olmuyor.
3. **Yön renkle değil şekille.** ▲ ▼ glifi her zaman var, renk ek ipucu.
4. **Teşvik yok.** Streak, konfeti, "şimdi al" aciliyeti ya da roket emojisi yok.
   Sayılar nötr sunuluyor.

Logo: eski "LOGO" yer tutucusu kalkıyor. Öneri: Inter Semibold, küçük harfli bir
**"borsalıyorum"** wordmark'ı. Noktasız "ı" markanın Türkçe imzası. Favicon ve uygulama
ikonu için `--accent` zeminli, 8px radius'lu kare içinde **"b"** monogramı. Son logo
çizimi açık soru (bkz. §12). Bileşen geçici olarak wordmark'ı metin olarak render eder.
`aria-label="Borsalıyorum ana sayfa"`.

---

## 2. Renk token'ları

Değerler `H S% L%` biçiminde (shadcn uyumlu), `hsl(var(--token))` ile kullanılıyor.
Koyu tema varsayılan (`.dark`), açık tema `:root`. Tam liste: `tokens.css`.

### 2.1 Tablo

| Token | Açık | Koyu | Kullanım |
|-------|------|------|----------|
| `--bg` | `220 20% 98%` #f9fafb | `224 24% 7%` #0e1016 | Sayfa zemini |
| `--bg-subtle` | `0 0% 100%` #ffffff | `224 20% 10%` #14171f | Kart, composer |
| `--bg-elevated` | `0 0% 100%` #ffffff | `224 17% 13%` #1c1f27 | Popover, dialog, hover kartı, autocomplete |
| `--bg-muted` ✚ | `220 18% 94%` #edeff2 | `224 15% 16%` #23262f | Hover/pressed satır, aktif öneri, skeleton |
| `--overlay` ✚ | `224 30% 6%` | `224 40% 2%` | Scrim (`/ 0.5`) |
| `--fg` | `222 32% 11%` #131825 | `220 25% 94%` #eceef4 | Birincil metin |
| `--fg-muted` | `220 12% 34%` #4c5361 | `220 12% 70%` #a9afbc | İkincil metin (şirket adı, açıklama) |
| `--fg-subtle` | `220 9% 42%` #616875 | `220 9% 60%` #9096a2 | Meta (zaman, sayaç, kullanıcı adı) |
| `--border` | `220 14% 89%` #dfe2e7 | `224 13% 19%` #2a2e37 | Dekoratif ayırıcı |
| `--border-strong` | `220 9% 54%` #7f8694 | `222 9% 46%` #6b7180 | Input / kontrol sınırı |
| `--accent` | `228 74% 48%` #2044d5 | `226 100% 74%` #7a99ff | Marka, link, entity, birincil buton |
| `--accent-fg` | `0 0% 100%` | `226 40% 8%` #0c101d | Accent üstü metin |
| `--accent-subtle` ✚ | `228 85% 95%` #e7ecfd | `226 45% 19%` #1b2546 | Cashtag chip'i, editörde tanınmış entity, seçili öğe |
| `--up` | `150 80% 24%` #0c6e3d | `148 62% 50%` #30cf7a | Yükseliş / bullish |
| `--up-bg` | `145 60% 93%` | `150 45% 13%` | Yükseliş etiketi zemini |
| `--down` | `358 72% 42%` #b81e23 | `0 88% 68%` #f56666 | Düşüş / bearish |
| `--down-bg` | `0 85% 96%` | `0 45% 15%` | Düşüş etiketi zemini |
| `--success` | = `--up` tonu | = `--up` tonu | Başarı ikonu (metin değil) |
| `--info` | `210 85% 36%` | `210 90% 70%` | Bilgi |
| `--warn` / `--warn-bg` ✚ | `32 95% 30%` / `40 95% 92%` | `38 92% 62%` / `38 50% 13%` | Karakter sınırına yaklaşma, uyarı bandı |
| `--danger` / `--danger-bg` ✚ | `0 72% 42%` / `0 85% 96%` | `0 88% 68%` / `0 45% 15%` | Hata, sınır aşımı, silme |
| `--focus-ring` | = accent | = accent | 2px outline, 2px offset |

✚ = skill'deki temel listeye eklenen token. Gerekçeleri:
- `--bg-muted`: Hover, aktif autocomplete öğesi ve skeleton için üçüncü bir yüzey tonu
  gerekiyor. `--bg-subtle` kartın kendisi olduğu için kart içi hover'ı ondan ayıramıyoruz.
- `--accent-subtle`: Cashtag chip'i ve editörde "tanındı" geri bildirimi için. Opaklıkla
  (`accent / 0.12`) yapılınca kontrast, alttaki yüzeye göre değişiyor ve ölçülemiyor.
  Sabit bir ton ölçülebilir.
- `--warn-bg`, `--danger-bg`: Composer hata bandı ve sınırı aşan metnin vurgusu.
  `--down-bg` ile aynı değer ama anlamı farklı. Piyasa rengi ileride değişirse hata
  rengi etkilenmesin.
- `--overlay`: Dialog/sheet scrim'i. Ham `bg-black/50` yazılmasın.

Ayrı bir `--link` token'ı **yok**: link = `--accent` (skill: cashtag/hashtag link rengini kullanır).

### 2.2 Kontrast kontrolü (WCAG 2.2 AA)

Hesap WCAG göreli parlaklık formülüyle yapıldı. Eşikler: metin ≥ 4.5, büyük metin/ikon/
kontrol sınırı ≥ 3.0.

| Çift | Açık | Koyu | Eşik | Sonuç |
|------|------|------|------|-------|
| fg / bg | 16.85 | 16.45 | 4.5 | ✓ |
| fg / bg-elevated | 17.66 | 14.31 | 4.5 | ✓ |
| fg-muted / bg | 7.35 | 8.69 | 4.5 | ✓ |
| fg-muted / bg-muted | 6.68 | 6.91 | 4.5 | ✓ |
| fg-subtle / bg | 5.35 | 6.41 | 4.5 | ✓ |
| fg-subtle / bg-muted | 4.86 | 5.09 | 4.5 | ✓ |
| fg-subtle / accent-subtle | 4.75 | 5.06 | 4.5 | ✓ |
| accent-fg / accent (buton) | 7.37 | 7.09 | 4.5 | ✓ |
| accent / bg (link) | 7.03 | 7.12 | 4.5 | ✓ |
| accent / bg-elevated | 7.37 | 6.20 | 4.5 | ✓ |
| accent / accent-subtle (chip) | 6.62 | 6.12 | 4.5 | ✓ |
| accent / bg-muted (aktif öğe) | 6.39 | 5.66 | 4.5 | ✓ |
| up / bg | 6.03 | 9.33 | 4.5 | ✓ |
| up / up-bg | 5.68 | 6.99 | 4.5 | ✓ |
| down / bg | 6.16 | 6.31 | 4.5 | ✓ |
| down / down-bg | 5.66 | 5.43 | 4.5 | ✓ |
| down / bg-elevated | 6.45 | 5.49 | 4.5 | ✓ |
| warn / warn-bg | 5.41 | 8.30 | 4.5 | ✓ |
| danger / danger-bg | 5.67 | 5.43 | 4.5 | ✓ |
| border-strong / bg | 3.48 | 3.90 | 3.0 | ✓ |
| border-strong / bg-elevated | 3.65 | 3.39 | 3.0 | ✓ |
| border-strong / bg-muted | 3.16 | 3.10 | 3.0 | ✓ (sınırda) |
| focus-ring / bg | 7.03 | 7.12 | 3.0 | ✓ |
| **accent / fg** (link ile çevre metin) | 2.26 | 2.12 | 3.0 | ✗ |

**Sonuç: link ve entity'ler yalnızca renkle ayrışamaz (WCAG 1.4.1).** Bu yüzden her
entity'nin renk dışında bir ipucu var (bkz. composer dokümanı §5): cashtag chip zemini +
semibold, hashtag ve mention semibold + önek karakteri, URL alt çizgi + ↗ ikonu.

Renk körlüğü: up ve down deuteranopi/protanopide birbirine yaklaşıyor. Glif (▲ ▼) ve
metin etiketi ("Yükseliş", "Düşüş") zorunlu. Duyarlılık etiketi renk olmadan da okunuyor.

`--border` (dekoratif) bilerek düşük kontrastlı. Bir kontrolün sınırını tek başına
bu token çizmiyor. Input, checkbox ve segment kontrolleri `--border-strong` kullanıyor.

---

## 3. Tipografi

- **Font: Inter (variable)**. Türkçe karakterleri tam destekliyor, `tnum` (tabular)
  özelliği var, küçük boyutta okunaklı, shadcn ekosisteminde yaygın.
  - `next/font/google` ile self-host, `display: 'swap'`, **`subsets: ['latin', 'latin-ext']`**.
    `ğ Ğ ş Ş ı İ` Latin Extended-A'da. Yalnızca `latin` yüklenirse bu harfler fallback
    fonttan gelir ve göze batar. **Kabul kriteri:** "İğdır Şişecam ılık" metni Inter ile
    render edilmeli (DevTools > Rendered Fonts'ta tek font).
  - CSS değişkeni: `--font-inter` → `--font-sans`.
  - Alternatif: Geist (Latin Extended destekli). Inter'in Türkçe metindeki uzun okuma
    rahatlığı ve hinting'i daha olgun, o yüzden tercih Inter.
- Monospace font yok. Hisse kodları Inter semibold + `tabular-nums` ile yazılıyor.
- Rakamlar: sayı gösteren her yerde `tabular-nums` (sayaç, beğeni, takipçi, kullanım sayısı).
- `<html lang="tr">` (en için `lang="en"`). CSS `uppercase` ancak doğru `lang` ile
  kullanılabilir. Hisse kodları veride zaten büyük harf, dönüşüm gerekmiyor.

| Rol | Boyut / satır | Ağırlık | Kullanım |
|-----|---------------|---------|----------|
| `text-xs` | 12 / 16 | 400–500 | Meta, rozet, sayaç, uyarı metni |
| `text-sm` | 14 / 20 | 400 | UI gövdesi, liste, buton |
| `text-post` | 15 / 1.5 | 400 | Gönderi ve yorum gövdesi, editör |
| `text-md` | 16 / 24 | 600 | Kart başlığı, dialog başlığı |
| `text-lg` | 20 / 28 | 600 | Sayfa başlığı (mobil) |
| `text-xl` | 24 / 32 | 600 | Sayfa başlığı (masaüstü), hisse kodu (hisse sayfası) |
| `text-2xl` | 32 / 40 | 700 | Yalnızca boş durum / landing başlığı |

Not: Editör iOS'ta 16px altında odaklanınca sayfayı zoomluyor. **Mobilde editör
`font-size: 16px`** (sm altı), sm ve üstünde 15px.

---

## 4. Boşluk, radius, gölge, hareket

- **Boşluk** (4px taban): `4 8 12 16 24 32 48` → Tailwind `1 2 3 4 6 8 12`. Arbitrary
  değer (`mt-[13px]`) lint ile yasak.
  - Kart iç boşluğu: mobil 12/16, sm+ 16.
  - Gönderi içi dikey ritim: header → gövde 4, gövde → medya 12, medya → aksiyonlar 8.
  - Kolonlar arası: 24 (lg), 32 (xl).
- **Radius**: `sm 4` (entity chip, rozet), `md 8` (buton, input, autocomplete öğesi),
  `lg 12` (kart, popover, medya, link önizleme), `full` (avatar, segment, FAB).
- **Gölge**: açık temada `shadow-sm` kart (opsiyonel), `shadow-md` popover/hover kartı,
  `shadow-lg` dialog. Koyu temada gölge yerine `--bg-elevated` + 1px `--border`.
  Gönderi kartında gölge yok, yalnızca alt ayırıcı var (akış "liste" gibi okunur).
- **Hareket**: `120ms` (hover, renk), `200ms` (popover, sheet), easing `--ease-out`.
  `prefers-reduced-motion: reduce` altında süreler 0 ve GIF'ler otomatik oynamıyor.
  Sayaç ve fiyat "flash" animasyonu yok (v1'de fiyat da yok).

---

## 5. İkon seti

- **Lucide** (shadcn varsayılanı, eski kodda zaten var). Stroke 1.75.
- Boyutlar: 16 (satır içi, meta), 20 (aksiyon çubuğu, toolbar), 24 (tab bar, boş durum: 32).
- İkon-only butonun görsel ikonu 20px ama dokunma alanı **44×44**.
  `aria-label` i18n'den geliyor.
- Yön glifleri Lucide'dan değil, metin karakteri: `▲` (U+25B2), `▼` (U+25BC), nötr için `–`.
  Ekran okuyucu için glif `aria-hidden`, yanında metin var ("Yükseliş").
- Eşleme: Akış `House`, Keşfet `Compass`, Gönderi `SquarePen`, Bildirimler `Bell`,
  Profil `CircleUser`, Ara `Search`, Görsel `Image`, GIF `ImagePlay`, Dış link `ArrowUpRight`,
  Yorum `MessageCircle`, Yeniden paylaş `Repeat2`, Beğen `Heart`, Paylaş `Share`,
  Daha fazla `Ellipsis`, Kapat `X`.
- Eski koddaki `TrendingUp` / `TrendingDown` büyük renkli kutuları kaldırılıyor.

---

## 6. Breakpoint'ler

Yalnızca Tailwind varsayılanları kullanılıyor. Eski `max-1170`, `max-1250`, `max-1500`,
`min-1500` ve `screen-minus-60` **taşınmıyor**.

| Ad | Min genişlik | Layout |
|----|-------------|--------|
| (taban) | 0 | Mobil: üst bar + tek kolon + alt tab bar |
| `sm` | 640 | Mobil geniş: aynı yapı, kart yan boşlukları artar, composer dialog olur |
| `md` | 768 | Sol ikon rayı (72px) + orta akış. Tab bar ve üst bar kalkar |
| `lg` | 1024 | Ray + akış (640) + sağ kolon (336) |
| `xl` | 1280 | Etiketli sol menü (248) + akış + sağ kolon. Toplam ~1272, ortalanmış |
| `2xl` | 1536 | xl ile aynı, yalnızca kenar boşluğu büyür (içerik genişlemez) |

Kural: Layout **CSS ile** değişiyor. JS ile `isMobile` (eski `next-useragent` +
Redux) kullanılmıyor, çünkü SSR'da yanlış tahmin CLS'ye yol açıyor.

---

## 7. Layout

### 7.1 Mobil (< 768)

```
┌──────────────────────────────────────┐
│ borsalıyorum              [🔍]  [◐] │  üst bar 56px, sticky, aşağı kaydırınca gizlenir
├──────────────────────────────────────┤
│ [ Takip ] [ Keşfet ] [ $Hisselerim ] │  akış sekmeleri (sticky, 44px)
├──────────────────────────────────────┤
│ (●) Ayşe K. @aysek · 3 dk     ▲ Yük. │
│     $THYAO için bilanço beklentim…   │  gönderi kartı (tam genişlik,
│     [ görsel 16:9 ]                  │  yalnızca alt ayırıcı)
│     💬 12   ⟲ 3   ♡ 48   ⤴           │
├──────────────────────────────────────┤
│ …                                    │
│ ┌──────────────────────────────────┐ │
│ │ Reklam                           │ │  sabit ölçülü reklam kutusu
│ │ [ 320×100 rezerve ]              │ │  (boşken de yer kaplar)
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│  ⌂      ◎       ✎       🔔      ◯    │  alt tab bar 56px + safe-area
│ Akış  Keşfet  Gönderi  Bildir. Profil│  etiketler her zaman görünür
└──────────────────────────────────────┘
```
- "Gönderi" sekmesi tam ekran composer sheet'ini açar (`/compose` rotası, geri tuşu
  kapatır). Ayrı FAB yok. Eski kodda FAB ile tab bar çakışıyordu.
- Auth bilinmiyorken: tab bar'daki "Profil" ve "Bildirimler" ikon yerinde skeleton daire
  gösterir. Anonim kullanıcıya tab bar yerine alt banner gösterilir:
  "Sohbete katıl: Kayıt ol · Giriş yap". **Bu banner auth çözülmeden render edilmez.**

### 7.2 Tablet (768–1279)

```
┌──────┬──────────────────────────────┬────────────────┐
│  b   │ Akış                    [🔍] │ (yalnızca lg+) │
│  ⌂   ├──────────────────────────────┤ ┌────────────┐ │
│  ◎   │ ┌ composer (kapalı) ───────┐ │ │ Gündem     │ │
│  🔔  │ │ (●) Ne düşünüyorsun?     │ │ │ $THYAO 214 │ │
│  ◯   │ └──────────────────────────┘ │ │ #bist100 … │ │
│      │ gönderi kartları…            │ └────────────┘ │
│ [✎]  │                              │ [Reklam 300×250│
│  (●) │                              │                │
└──────┴──────────────────────────────┴────────────────┘
 72px ray      akış max 640                336 (lg+)
```

### 7.3 Masaüstü (≥ 1280)

```
┌──────────────────┬────────────────────────────────┬──────────────────────┐
│ borsalıyorum     │ Akış                           │ [🔍 Hisse, etiket,   │
│                  │ [Takip] [Keşfet] [$Hisselerim] │      kişi ara    ⌘K] │
│ ⌂  Akış          ├────────────────────────────────┤                      │
│ ◎  Keşfet        │ ┌ composer (satır içi) ──────┐ │ Son 24 saatte en çok │
│ 🔔 Bildirimler 3 │ │ (●) Ne düşünüyorsun?       │ │ bahsedilenler        │
│ ✉  Mesajlar*     │ │                            │ │ 1 $THYAO  214 gönderi│
│ ◯  Profil        │ │ [🖼][GIF][$]  ▲▼–  … [Paylaş]│ │ 2 $ASELS  132 gönderi│
│ ⚙  Ayarlar       │ │ Uyarı kısa metni · Ayrıntı │ │ …                    │
│                  │ └────────────────────────────┘ │ Takip ettiğin hisseler│
│ [ Gönderi paylaş]│ ── gönderi ──                  │ $EREGL  $SISE  …     │
│                  │ ── gönderi ──                  │ ┌──────────────────┐ │
│                  │                                │ │ Reklam  300×250  │ │
│ (●) Ayşe K.   …  │                                │ └──────────────────┘ │
│     @aysek       │                                │ Footer: uyarı metni, │
│                  │                                │ KVKK, Koşullar, ©    │
└──────────────────┴────────────────────────────────┴──────────────────────┘
  248 sticky              640                         336 sticky
```
- Sol menü ve sağ kolon `position: sticky; top: 0` ve kendi içinde kaydırılır.
- Arama sağ kolonun en üstünde, `⌘K` / `Ctrl+K` ile açılan bir komut paleti (shadcn
  `Command`).
- "Gönderi paylaş" butonu composer'ı dialog olarak açar. Satır içi composer akışın
  başında durur.
- Sağ kolondaki "Gündem" listesi **nötr ve ölçüte dayalı**: başlıkta ölçüt yazılı
  ("Son 24 saatte en çok bahsedilenler"). "Yükselenler" ya da "Fırsat" gibi ifade yok.
- Footer'da yatırım tavsiyesi değildir uyarısının tam metni var (legal-advisor'dan).
- `*` Mesajlar v1 kapsamında değil, yer tutucu.

### 7.4 Gönderi kartı anatomisi

```
┌──────────────────────────────────────────────────────────┐
│ [Reklam / İşbirliği]                    ← yalnızca sponsorluysa, en üstte
│ (●40) Ayşe Kaya  @aysek · 3 dk           [▲ Yükseliş] [⋯]│
│       $THYAO bilanço sonrası marjlar #bist100 hakkında   │  text-post, 6 satır clamp
│       @mehmet ne düşünüyor? kap.org.tr/tr/Bildirim/12…↗  │
│       Devamını gör                                       │
│       ┌────────────────────────────────────────────────┐ │
│       │ [görsel veya link önizleme kartı]              │ │  radius lg
│       └────────────────────────────────────────────────┘ │
│       💬 12     ⟲ 3     ♡ 48     ⤴                       │  44px hedefler
└──────────────────────────────────────────────────────────┘
```
- Avatar 40 (mobil 36). Ad `text-sm` semibold `--fg`, kullanıcı adı ve zaman `--fg-subtle`.
- Zaman `<time datetime>` olarak göreli gösteriliyor, tooltip'te tam tarih
  (`10 Eki 2026 14:32`, Europe/Istanbul).
- Duyarlılık etiketi: `text-xs`, 20px yükseklik, `radius-full`, `--up-bg`/`--up`,
  `--down-bg`/`--down`. Nötrde **etiket yok** (gürültüyü azaltıyor).
- Clamp: akışta 6 satır (eski 3 satır çok kısaydı), detay sayfasında clamp yok.
- Kartın tamamı tıklanabilir (detaya gider). İç linkler `stopPropagation` ile kendi
  hedeflerine gider. Kartın erişilebilir adı gönderi metni değil "Gönderi: Ayşe Kaya,
  3 dakika önce". Kart `<article>`, detay linki görünmez overlay değil, zaman öğesi.
- Sponsorlu etiket: `text-xs` medium, `--fg-muted` metin, `--bg-muted` zemin, `radius-sm`,
  başında `Megaphone` 12px ikonu. İçerikten önce okunur (DOM sırası da önce).

---

## 8. Temel bileşen listesi

shadcn/ui primitive'leri temel alınıyor (Radix). Kendi dropdown, modal ya da popover'ımızı
yazmıyoruz. **Kalın** olanlar yeni ya da özel bileşen.

| Katman | Bileşen | Not |
|--------|---------|-----|
| Primitive (shadcn) | Button, IconButton, Input, Textarea, Switch, Checkbox, RadioGroup, ToggleGroup, Dialog, Sheet (Drawer), Popover, HoverCard, Tooltip, DropdownMenu, Command, Tabs, Toast (Sonner), Skeleton, Avatar, Badge, Separator, ScrollArea | Token'larla yeniden temalanmış |
| Kabuk | **AppShell**, **TopBar**, **TabBar**, **SideNav** (rail + geniş), **RightRail**, **Footer**, **AdSlot** | AdSlot sabit ölçülü, "Reklam" etiketli |
| Kimlik | **Wordmark**, **UserChip** (avatar + ad + @kullanıcı), **AuthSlot** | AuthSlot: auth `unknown` iken skeleton |
| İçerik | **PostCard**, **CommentItem**, **RichText** (entity render), **EntityLink** (cashtag/hashtag/mention/url), **StockHoverCard**, **UserHoverCard**, **LinkPreviewCard**, **MediaGrid**, **SentimentTag**, **SponsoredLabel**, **RelativeTime** | Composer dokümanında ayrıntılı |
| Yazma | **Composer** (post/comment/dialog/sheet), **EntityAutocomplete**, **CharCounter**, **SentimentPicker**, **MediaAttach**, **GifPicker**, **DisclaimerShort** | Aynı doküman |
| Durum | **EmptyState**, **ErrorState**, **InlineRetry**, **FeedSkeleton** | Skill'deki durum tablosu |
| Finans | **TickerBadge** (kod + pazar), **ExternalLinks** (KAP, TradingView) | v1 fiyatsız |

Buton varyantları: `primary` (accent dolgu), `secondary` (bg-muted dolgu, fg metin),
`ghost`, `outline` (border-strong), `danger`. Boyutlar: `sm` 32 (yalnızca masaüstü,
yoğun liste), `md` 40, `lg` 44. Mobilde varsayılan `lg`. Metin uzunluğuna göre genişliyor,
sabit genişlik yok.

---

## 9. Durum desenleri (tüm bileşenlerde)

| Durum | v2 deseni | Metin örneği (tr / en) |
|-------|-----------|------------------------|
| Loading | Aynı ölçüde skeleton, 300ms gecikmeyle görünür. Spinner yalnızca buton içinde. | (yok) |
| Empty | 32px ikon + tek cümle + tek aksiyon | "Takip ettiğin hisse yok. Keşfet'e göz at." / "You don't follow any stocks yet. Take a look at Discover." |
| Error | Ne oldu + ne yapabilir, teknik detay yok | "Akış yüklenemedi. Tekrar dene" / "Couldn't load the feed. Try again" |
| Partial | Liste sonunda satır içi hata + "Tekrar dene" | "Daha fazlası yüklenemedi. Tekrar dene" / "Couldn't load more. Try again" |
| Auth bilinmiyor | AuthSlot skeleton. "Giriş yap" **asla** önce gösterilmiyor. | (yok) |
| Yetkisiz | Aksiyon denenince (beğen vb.) giriş sheet'i açılıyor, sayfa yönlendirmesi yok | "Beğenmek için giriş yap." / "Log in to like this." |

---

## 10. Erişilebilirlik özeti

- Focus: `:focus-visible` üzerinde 2px `--focus-ring` outline, 2px offset. Kart içinde
  offset -2 (inset).
- Dokunma hedefi ≥ 44×44. Görsel olarak küçük kontrollerde (entity chip, sayaç) hedef
  pseudo-element ile genişletiliyor, satır yüksekliği bozulmuyor.
- Skip link: "İçeriğe geç" / "Skip to content", ilk odaklanabilir öğe.
- Landmark'lar: `header`, `nav[aria-label="Ana menü"]`, `main`, `aside[aria-label="Gündem"]`,
  `footer`. Akış `role="feed"` + her kart `article` ve `aria-setsize` / `aria-posinset`.
- `prefers-reduced-motion`: animasyon yok, GIF'ler duraklatılmış başlıyor.
- `prefers-color-scheme`: ilk ziyarette sistem teması, sonra kullanıcı tercihi
  (next-themes). Varsayılan koyu.
- Metin %200 büyütmede yatay kaydırma yok (320 CSS px genişlikte test).

---

## 11. Eski tasarımdan bilinçli kopuşlar

| Eski | v2 |
|------|----|
| "LOGO" metni | Wordmark + monogram |
| Source Sans Pro (self-host değil) | Inter, `next/font`, latin-ext |
| `--bullish` virgüllü HSL (`143, 71%, 45%`, geçersiz sözdizimi), `--blue-primary`, `--description`, `themeColor #131722` | Semantik token seti, tek accent |
| Özel breakpoint'ler (`max-1170` vb.), `lg:w-[870px]` | Tailwind varsayılanları, `--feed-max-w` |
| `react-mentions` + `bg-slate-700` vurgusu, `#ff0000` mention | Entity stilleri (composer dokümanı) |
| Büyük renkli duyarlılık kutusu (yalnızca ikon, metin yok) | Küçük etiket, glif + metin |
| Hamburger + sağdan kayan menü (mobil) | Alt tab bar |
| `isMobile` JS tespiti | CSS breakpoint'leri |

---

## 12. Açık sorular

1. Logo: wordmark yönü onaylanıyor mu? Profesyonel çizim yapılacak mı?
2. Varsayılan tema koyu (skill gereği). Landing ve SEO sayfaları da koyu mu açılsın?
3. "Takip / Keşfet / $Hisselerim" akış sekmeleri ürün kapsamında mı? (architect + PM)
4. Reklam kutusu ölçüleri (320×100 mobil, 300×250 sağ kolon) reklam sağlayıcı kararına bağlı.
5. Footer uyarı metninin kısa ve uzun versiyonları legal-advisor'dan bekleniyor.
