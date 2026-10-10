---
name: design-system
description: Borsalıyorum tasarım sistemi — renk/tipografi/boşluk token'ları, finans verisi gösterimi (fiyat, yüzde, yükseliş/düşüş), Türkçe yerelleştirme kuralları, layout, bileşen durumları (loading/empty/error), erişilebilirlik ve yasal UI öğeleri. Ekran, bileşen, akış tasarlarken, UI kodu yazarken veya UI review yaparken kullan.
---

# Design System

Ürün: hızlı akan, yoğun bilgi içeren bir borsa sosyal akışı. Hedef his: **sakin, güvenilir,
okunaklı**. Kumarhane/heyecan estetiğinden (yanıp sönen yeşiller, roket emojileri, konfeti)
kaçın — hem güven için hem de SPK açısından "al-sat teşviki" algısı yaratmamak için.

## Token'lar

Tüm renkler CSS değişkeni olarak semantik isimle tanımlanır; bileşende ham hex/HSL yazılmaz.

| Token | Kullanım |
|-------|----------|
| `--bg`, `--bg-subtle`, `--bg-elevated` | Sayfa, kart, popover |
| `--fg`, `--fg-muted`, `--fg-subtle` | Metin hiyerarşisi |
| `--border`, `--border-strong` | Ayırıcılar |
| `--accent`, `--accent-fg` | Marka/ana aksiyon (tek renk) |
| `--up`, `--up-bg` | Yükseliş / bullish |
| `--down`, `--down-bg` | Düşüş / bearish |
| `--warn`, `--danger`, `--success`, `--info` | Sistem durumları |
| `--focus-ring` | Klavye odağı |

- Koyu tema varsayılan, açık tema eşit kalitede. Her token iki temada da tanımlı.
- Kontrast: gövde metni ≥ 4.5:1, büyük metin ve ikon ≥ 3:1 (WCAG 2.2 AA). `--up`/`--down`
  her iki temada bu oranı sağlamalı.
- Boşluk ölçeği 4px tabanlı (4, 8, 12, 16, 24, 32, 48). Rastgele `mt-[13px]` yok.
- Radius: `sm 4px`, `md 8px`, `lg 12px`, `full`.
- Breakpoint'ler Tailwind varsayılanları (`sm md lg xl 2xl`). Eski koddaki `max-1170` gibi
  özel breakpoint'ler yeniden üretilmez.

## Tipografi

- Font: Türkçe karakterleri (ğ ü ş ı İ ö ç) tam destekleyen değişken font (ör. Inter, Geist).
  `next/font` ile self-host, `display: swap`.
- Sayılar her yerde `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`) — fiyat
  kolonları kaymasın.
- Ölçek: 12 / 14 (gövde) / 16 / 20 / 24 / 32. Gövde 14-15px, satır yüksekliği 1.5.

## Finans verisi gösterimi

- Biçimlendirme `Intl.NumberFormat('tr-TR')` ile: `1.234,56 ₺`, `%2,35`, `-%1,20`.
  Yüzde işareti Türkçede **önde**: `%2,35`. İngilizce locale'de `2.35%`.
- Yön asla sadece renkle anlatılmaz: `▲ %2,35` / `▼ %1,20` veya ikon + işaret. (Renk körlüğü)
- Yükseliş yeşil, düşüş kırmızı (Türkiye piyasa konvansiyonu).
- Gecikmeli veri gösteriliyorsa fiyatın yanında "15 dk gecikmeli" etiketi ve kaynak (lisans
  gereği — bkz. `turkish-legal-compliance`).
- Büyük sayılar kısaltma: `1,2 Mn`, `3,4 Mr` (tr), tam değer tooltip'te.
- Zaman: akışta göreli ("3 dk önce"), hover/tooltip'te tam tarih `10 Eki 2026 14:32`.
  Saat dilimi `Europe/Istanbul`.
- Cashtag `$THYAO` ve hashtag `#bist100` görsel olarak ayrışır ama ikisi de link rengini kullanır.
- Gönderi duyarlılığı (bullish/bearish) küçük etiket olarak; büyük, bağıran rozet değil.

## Türkçe yerelleştirme tuzakları

- Büyük harf dönüşümü: `toLocaleUpperCase('tr-TR')` (i → İ, ı → I). CSS `text-transform:
  uppercase` kullanılıyorsa `<html lang="tr">` doğru olmalı.
- Arama/sıralama: `localeCompare(x, 'tr')`, arama normalizasyonunda ı/i, ş/s eşleştirme.
- İngilizceye göre metin %15-30 uzayabilir; butonlarda sabit genişlik yok.
- Ekler: "{name}'in" gibi birleştirme yapma (ünlü uyumu bozulur); cümleyi isim sona gelecek
  ya da ek gerektirmeyecek şekilde kur: "Gönderen: {name}".

## Layout

- Mobil öncelikli. Mobil: üst bar (logo, arama) + alt tab bar (Akış, Keşfet, Gönderi,
  Bildirimler, Profil). Masaüstü: sol navigasyon, orta akış (max ~640px), sağ kolon
  (trendler, takip edilen hisseler).
- Reklam alanları sabit ölçülü kutu; boşken de yer kaplar (CLS yok). Reklam her zaman
  "Reklam" etiketiyle, içerikten ayırt edilebilir.
- Dokunma hedefi ≥ 44×44px.

## Bileşen durumları (her bileşende zorunlu)

| Durum | Desen |
|-------|-------|
| Loading | İçerikle aynı ölçüde skeleton. Spinner sadece buton içinde. 300ms altı yüklemelerde skeleton göstermeden önce kısa gecikme. |
| Empty | İkon + tek cümle açıklama + bir sonraki aksiyon ("Takip ettiğin hisse yok. Keşfet'e göz at."). |
| Error | Ne oldu + ne yapabilir ("Akış yüklenemedi. Tekrar dene"). Teknik detay yok. |
| Partial | Liste sonunda "Daha fazla yükle" hata durumu satır içinde, tüm sayfayı bozmadan. |
| Auth bilinmiyor | Kullanıcı alanında skeleton. **Asla** önce "Giriş yap" gösterip sonra değiştirme. |

Mutasyon geri bildirimi: buton içi spinner → başarıda kısa toast ya da satır içi değişim.
Beğeni/takip gibi küçük aksiyonlar optimistic.

## Erişilebilirlik

- Tüm etkileşimler klavye ile; görünür focus ring.
- Radix/shadcn primitive'leri kullan; kendi dropdown/modal'ını yazma.
- İkon-only butonlarda `aria-label` (i18n'den).
- `prefers-reduced-motion` saygı; fiyat değişim "flash" animasyonları kapatılabilir.
- Görsellerde alt metin; kullanıcı yüklediği görsele alt metin ekleyebilir.

## Yasal UI öğeleri

- Hisse sayfası, gönderi oluşturma ekranı ve footer'da yatırım tavsiyesi değildir uyarısı
  (metin `turkish-legal-compliance`'tan, kendin yazma).
- Çerez banner'ında "Kabul et" ve "Reddet" **eşit görsel ağırlıkta**, aynı katmanda.
  Önceden işaretli kutu yok.
- Sponsorlu/işbirliği gönderisi etiketi ("Reklam / İşbirliği") gönderi başında görünür.
- Kayıt formunda aydınlatma metni linki ve ayrı, işaretsiz pazarlama izni kutusu.

## Çıktı formatı (tasarım teslimi)

Bir ekran tasarlarken şunları ver: amaç, kullanıcı akışı, layout (mobil + masaüstü),
kullanılan bileşenler ve token'lar, tüm durumlar (yukarıdaki tablo), metinler (tr + en),
erişilebilirlik notları, açık sorular.
