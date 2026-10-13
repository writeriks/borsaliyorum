# Sermaye Piyasası — 6362 sayılı SPK Kanunu ve ilgili düzenlemeler

Ürünün en kritik risk alanı. Güncel SPK ilke kararları ve duyurularını `spk.gov.tr`'den doğrula.

## 1. Yatırım danışmanlığı

- Yatırım danışmanlığı, SPK izni gerektiren bir yatırım hizmetidir (yetkili aracı kurum,
  portföy yönetim şirketi vb.). Kişiye özel, ücret karşılığı ya da düzenli yönlendirme
  bu kapsama girebilir.
- Platform **kendisi** tavsiye üretmez: editoryal "günün hissesi", "al/sat/tut" rozetleri,
  hedef fiyat, model portföy, otomatik sinyal botu, kişiselleştirilmiş "sana uygun hisseler"
  önerisi **yapılmaz**. Trend/en çok konuşulan listesi nötr, ölçüte dayalı ve açıklamalı olur
  ("son 24 saatte en çok bahsedilen").
- **Premium** özellik planlanıyorsa (şemada `premiumBeginDate` var): içerik/analiz satmak
  danışmanlık riskini ciddi artırır. Premium sadece ürün özelliği (reklamsız, gelişmiş filtre,
  gelişmiş profil) olmalı. Ücretli "uzman" içerik satışı → **avukat + SPK mevzuatı analizi
  zorunlu**.
- Uyarı metni (yayına almadan önce avukat onayı):

  > Burada yer alan yatırım bilgi, yorum ve tavsiyeleri yatırım danışmanlığı kapsamında
  > değildir. Yatırım danışmanlığı hizmeti, aracı kurumlar, portföy yönetim şirketleri,
  > mevduat kabul etmeyen bankalar ile müşteri arasında imzalanacak yatırım danışmanlığı
  > sözleşmesi çerçevesinde sunulmaktadır. Burada yer alan yorum ve tavsiyeler, yorum ve
  > tavsiyede bulunanların kişisel görüşlerine dayanmaktadır. Bu görüşler mali durumunuz ile
  > risk ve getiri tercihlerinize uygun olmayabilir. Bu nedenle, sadece burada yer alan
  > bilgilere dayanılarak yatırım kararı verilmesi beklentilerinize uygun sonuçlar
  > doğurmayabilir.

  Yerleşim: footer (her sayfa), hisse sayfası, gönderi oluşturma ekranında kısa versiyon +
  link, kullanım koşulları.

## 2. Piyasa dolandırıcılığı (md.107)

- Bilgi bazlı piyasa dolandırıcılığı: fiyatları etkilemek amacıyla yalan, yanlış, yanıltıcı
  bilgi, söylenti, haber, yorum yaymak — hapis ve adli para cezası öngörülür. Kullanıcı
  içeriği platformda yayıldığı için platform; tespit, kaldırma ve resmi talep süreçlerine
  hazır olmalı.
- Ürün gereksinimleri:
  - "Yanıltıcı bilgi / manipülasyon" şikayet kategorisi.
  - Aynı hisse için kısa sürede çok sayıda koordineli hesaptan gelen benzer içerik tespiti
    (pump-and-dump sinyali) → moderasyon kuyruğu.
  - Silinen içerik ve hesap etkinliği, resmi makam taleplerine yanıt için yasal süre boyunca
    saklanır (bkz. icerik-5651.md log bölümü).
  - Kullanım koşullarında manipülasyon, bedelli tanıtım ve "içeriden bilgi" (md.106) paylaşımı
    yasağı.
- Etiketsiz ücretli hisse tanıtımı hem reklam mevzuatı hem md.107 açısından risklidir;
  sponsorlu içerik etiketi zorunlu, sponsorlu hisse tanıtımı politika olarak yasaklanabilir.

## 3. İzinsiz faaliyet ve erişim engeli

SPK, izinsiz sermaye piyasası faaliyeti yapılan internet sitelerine/hesaplara erişim engeli
talep edebilir. Platformda ücretli "VIP grup / Telegram sinyal" reklamı yapan kullanıcı
içerikleri politika gereği kaldırılır.

## 4. Kripto varlıklar

2024'te 6362'ye eklenen kripto varlık hükümleriyle kripto varlık hizmet sağlayıcılar SPK
izin/denetimine girdi. Platform kripto konuşmasına izin verebilir; ancak:
- İzinsiz platformların reklamı/yönlendirme linki alınmaz.
- Airdrop/ödül karşılığı tanıtım etiketlenir ya da yasaklanır.
Güncel SPK listelerini ve reklam kısıtlarını doğrula.

## 5. Piyasa verisi lisansı

- Borsa İstanbul verisinin (gerçek zamanlı ya da gecikmeli) yeniden yayını Borsa İstanbul /
  yetkili veri dağıtıcısı lisansına tabidir.
- Seçenekler: (a) lisanslı sağlayıcının widget'ı (TradingView vb.) — kendi kullanım şartlarına
  uy, kaynak görünür; (b) lisanslı veri dağıtıcısından API + lisans sözleşmesi.
- Kendi sunucumuzda fiyat scrape etmek **yapılmaz**.
- Ekranda: kaynak ve gecikme etiketi ("Veriler 15 dk gecikmelidir. Kaynak: …").
