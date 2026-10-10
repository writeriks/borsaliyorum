# Çerezler ve Ticari Elektronik İleti

## Çerezler (KVKK Çerez Uygulamaları Hakkında Rehber)

| Tür | Örnek | Rıza |
|-----|-------|------|
| Zorunlu | `__session`, CSRF, dil tercihi, çerez tercihi | Gerekmez, aydınlatma yeterli |
| Fonksiyonel | tema tercihi (sunucuya gitmiyorsa localStorage) | Değerlendir; genelde rıza |
| Analitik | GA, PostHog, Plausible (kimliksiz ise risk düşük) | Açık rıza |
| Reklam/hedefleme | Google Ads, Meta piksel | Açık rıza |

Banner gereksinimleri:
- İlk katmanda "Kabul et" ve "Reddet" eşit görünürlükte. "Reddet"i ayarların içine gömme.
- Rıza alınmadan rıza gerektiren hiçbir script yüklenmez (tag'ler consent'e bağlı lazy load).
- Tercihler kategori bazında; sonradan footer'daki "Çerez tercihleri" linkiyle değiştirilebilir.
- Rıza kaydı (zaman, sürüm, kategoriler) saklanır.
- Üçüncü taraf widget'lar (TradingView vb.) kendi çerezlerini yazıyorsa analitik/reklam
  kategorisinde değerlendirilir; rıza yokken placeholder + "yüklemek için tıkla".

## Ticari elektronik ileti — 6563 sayılı Kanun + Yönetmelik

- Pazarlama/tanıtım içerikli e-posta, SMS, push: önceden **onay** gerekir. Onay ayrı,
  işaretsiz checkbox ile alınır.
- Ticari ileti göndermeden önce **İYS (İleti Yönetim Sistemi)** kaydı ve onayların İYS'ye
  yüklenmesi; gönderimden önce İYS'den kontrol. (Bireysel alıcılar için zorunlu.)
- Her iletide kolay ret (unsubscribe) linki; ret talebi kısa sürede işlenir (bilinen: 3 iş günü).
- **İşlemsel** iletiler (şifre sıfırlama, e-posta doğrulama, güvenlik bildirimi, "gönderine
  yorum yapıldı" bildirimi) ticari ileti sayılmaz; içine kampanya/tanıtım eklenirse ticari
  iletiye dönüşür.
- Uygulama içi bildirim ve push ayarları ticari / işlemsel olarak ayrı kategorilerde.
