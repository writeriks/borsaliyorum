# iOS Safari manuel kontrol listesi (M1)

Otomatik testler Chromium'da koşar (Pixel 7 emülasyonu dahil); WebKit/iOS'a özgü davranışlar
burada elle doğrulanır. Gerçek cihazda (iPhone, güncel iOS Safari) ve bir de Chrome iOS ile
(aynı WebKit, farklı kabuk) denenir. Sonuç sütununa tarih + cihaz + iOS sürümü yazılır.

Ortam: Vercel preview ya da canlı adres; test hesabı + bir takip edilen yazarın birkaç gönderisi.

| # | Kontrol | Beklenen | Sonuç |
|---|---------|----------|-------|
| 1 | Giriş formu: e-posta alanına dokun | Sayfa yakınlaşmaz (alan yazı boyutu 16 px) | |
| 2 | E-posta/şifre ile giriş | Düğme anında "Giriş yapılıyor…"; sonra tam sayfa geçiş, hiçbir karede "Giriş yap" yok | |
| 3 | Google ile giriş (popup) | Popup engellenmez, giriş tamamlanır. Engellenirse anlaşılır hata, takılı spinner yok | |
| 4 | Giriş sonrası sayfayı yenile; Safari'yi kapatıp aç | Oturum sürer (`__session`, 14 gün) | |
| 5 | Çıkış yap, sonra geri tuşu ve kenardan geri kaydırma | Korumalı içerik (akış) gösterilmez; giriş sayfasına düşer (bfcache) | |
| 6 | Akışta aşağı kaydır, "Daha fazla yükle" | Sonraki sayfa yüklenir, kaydırma zıplamaz; alt sekme çubuğu ana göstergenin altında kalmaz (safe-area) | |
| 7 | Gönderi detayına gir, geri dön | Akış kaydırma konumu korunur | |
| 8 | `/paylas` (mobil tam ekran composer) aç | İmleç editörde; klavye açılınca araç çubuğu klavyenin hemen üstünde (`visualViewport`), sayfa kaymaz | |
| 9 | Composer'a `$` yaz | Hisse listesi görünür, seçilebilir; Türkçe klavyede ı/İ/ş/ğ ile arama çalışır | |
| 10 | `@` ve `#` yaz; öneriye dokun | Öneri seçilir, imleç sonrasına gider; klavye kapanmaz | |
| 11 | Metni yapıştır (biçimli metin, bağlantı) | Düz metin girer; biçim taşınmaz | |
| 12 | Uzun metin yaz (karakter sınırına yakın) | Sayaç güncellenir, sınır aşılınca Paylaş pasif ve mesaj görünür | |
| 13 | Gönderi paylaş | Düğmede spinner, sonra akışta yeni kart; taslak temizlenir | |
| 14 | Taslak: yaz, sekmeyi değiştir/kilitle, geri gel | Taslak korunur | |
| 15 | Kart gövdesi 6 satırı aşıyorsa "Devamını gör" | Açılır/kapanır, yerleşim kaymaz | |
| 16 | Kartta beğen | Anında dolar; ağ koparsa geri alınır ve uyarı çıkar | |
| 17 | Tema menüsü: koyu / açık / sistem | Anında değişir, yenilemede korunur, ilk boyamada yanlış tema parlaması yok | |
| 18 | Yatay çevir (landscape) | Düzen bozulmaz, içerik kenar çentiğinin altında kalmaz | |
| 19 | Yazı boyutu büyük (Ayarlar > Ekran > Metin Boyutu) | Metin kırpılmaz, düğmeler 44 px altına inmez | |
| 20 | Yasal sayfalar (`/yasal/*`) ve footer'daki yatırım uyarısı | Okunur, bağlantılar çalışır | |
| 21 | İngilizce (`/en`) arayüz | Metinler uzasa da düğmeler taşmaz | |

Bulgu çıkarsa: sayfa, cihaz/iOS sürümü, adımlar, ekran kaydı ile sorun açılır; bu liste
güncellenir. Android Chrome için aynı liste 1-3, 6-13 maddeleriyle uygulanır.
