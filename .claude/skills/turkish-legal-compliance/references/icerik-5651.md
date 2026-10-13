# İçerik Sorumluluğu — 5651 sayılı Kanun

Güncel eşik ve süreleri `mevzuat.gov.tr` ve `btk.gov.tr`'den doğrula.

## Rol: yer sağlayıcı

- Yer sağlayıcı, barındırdığı içeriği önceden kontrol etmekle yükümlü değildir; ancak
  hukuka aykırı içerikten **haberdar edildiğinde** (bildirim, mahkeme/idari karar) kaldırmakla
  yükümlüdür.
- Kişilik hakkı ihlali iddiasıyla içerik çıkarma talepleri (md.9) — talebe hızlı yanıt
  (bilinen: 24 saat) ve hakim kararlarına uyum süreci gerekir.
- Erişim engeli / içerik çıkarma kararlarına süresi içinde uyulur; bunun için operasyonel
  sorumlu ve iletişim kanalı tanımlanır.
- Trafik bilgisi (log) saklama: Yer sağlayıcılar yönetmeliğe göre trafik bilgisini belirli
  süre saklar (bilinen: 1 yıldan az 2 yıldan çok olmamak üzere) ve doğruluk/gizliliğini sağlar.
  Ürün tarafında: kullanıcı ID, IP, port, zaman damgası, işlem türü — değiştirilemez (append-only)
  depolamada; erişim yetkili personelle sınırlı.
- Site üzerinde iletişim/künye bilgileri (yer sağlayıcı olarak tanıtıcı bilgiler) yayımlanır.

## Büyüme eşiği: sosyal ağ sağlayıcı

7253 ve 7418 sayılı kanunlarla eklenen hükümler: Türkiye'den günlük erişimi belirli eşiği
(bilinen: 1 milyon) aşan sosyal ağ sağlayıcılar için Türkiye'de temsilci atama, başvurulara
süreli yanıt (bilinen: 48 saat), periyodik şeffaflık raporu, belirli verilerin Türkiye'de
saklanması gibi ağır yükümlülükler doğar. Mimari bugünden buna hazırlıklı olmalı (veri
lokasyonu, raporlanabilir moderasyon kayıtları). Eşiğe yaklaşınca **avukat analizi zorunlu**.

Dezenformasyon (TCK 217/A) ve kişilik hakları iddiaları için hızlı inceleme süreci gerekir.

## Moderasyon sistemi gereksinimleri

- Her gönderi/yorum/profilde "Şikayet et": kategori (yanıltıcı bilgi/manipülasyon, hakaret,
  kişilik hakkı, spam, telif, yasa dışı içerik, diğer) + açıklama.
- Moderasyon kuyruğu: durum, karar, gerekçe, karar veren, zaman — denetlenebilir kayıt.
- Resmi talepler (mahkeme, BTK, SPK, savcılık) ayrı kanal ve kayıt; süre takibi.
- Kaldırılan içeriğin sahibine bildirim ve itiraz yolu.
- Engelleme/sessize alma kullanıcı araçları.
- Kullanım koşulları: yasaklı içerik listesi, yaptırımlar (uyarı, kısıtlama, hesap kapatma).

## Kullanıcı içeriği lisansı

Kullanım koşullarında kullanıcının içeriği üzerinde platforma basit (münhasır olmayan)
kullanım izni; içeriğin sorumluluğunun kullanıcıda olduğu; platformun kaldırma hakkı.
