---
name: turkish-legal-compliance
description: Borsalıyorum için Türk hukuku uyum çerçevesi — KVKK (kişisel veri, açık rıza, yurt dışı aktarım, çerez), 6362 SPK Kanunu (yatırım danışmanlığı, piyasa dolandırıcılığı, kripto), 5651 (yer sağlayıcı, içerik kaldırma, log), 6563 ticari elektronik ileti/İYS, tüketici/abonelik, reklam ve sponsorlu içerik, piyasa verisi lisansı. Özellik, veri toplama, metin, üyelik, premium, bildirim, analitik, içerik moderasyonu veya hisse/kripto gösterimi ile ilgili her hukuki soru ve kararda kullan.
---

# Türk Hukuku Uyum Çerçevesi

> Bu skill bir avukatın yerini tutmaz. Çıktılar **risk analizi ve taslak**tır. "Avukat onayı
> gerekli" diye işaretlenen her madde yayına almadan önce Türkiye'de ruhsatlı bir avukata
> (tercihen bilişim + sermaye piyasası alanında) onaylatılmalıdır.

## Ürünün hukuki profili

Borsalıyorum; kullanıcıların hisse ve diğer yatırım araçları hakkında içerik ürettiği bir
platformdur. Bu yüzden aynı anda:

1. **Veri sorumlusu** (KVKK) — üyelik, profil, IP/log, analitik verisi işler.
2. **Yer sağlayıcı** (5651) — kullanıcı içeriğini barındırır; büyüyünce **sosyal ağ
   sağlayıcı** eşiklerine tabi olabilir.
3. **Sermaye piyasası riski taşıyan platform** (6362) — kendisi yatırım danışmanlığı yapmamalı,
   piyasa dolandırıcılığına (bilgi bazlı manipülasyon) aracılık eder hale gelmemeli.
4. Premium/ücretli özellik varsa **satıcı** (6502 Tüketici Kanunu, mesafeli sözleşme).
5. Reklam alıyorsa **reklam veren/yayıncı** yükümlülükleri.

## Konu → referans dosyası

| Konu | Dosya |
|------|-------|
| KVKK, aydınlatma, açık rıza, VERBIS, yurt dışı aktarım, ihlal bildirimi, silme | `references/kvkk.md` |
| Çerezler, analitik, pazarlama e-postası/SMS, İYS | `references/cerez-ve-ticari-ileti.md` |
| Yatırım tavsiyesi, SPK, piyasa dolandırıcılığı, kripto, piyasa verisi lisansı | `references/sermaye-piyasasi.md` |
| 5651, içerik kaldırma, log saklama, moderasyon, sosyal ağ sağlayıcı eşikleri | `references/icerik-5651.md` |
| Premium abonelik, tüketici, reklam/sponsorlu içerik, fikri mülkiyet | `references/tuketici-reklam-fikri.md` |
| Yayına almadan önce gereken metin ve süreçler | `references/lansman-kontrol-listesi.md` |

İlgili dosyayı oku; tümünü değil.

## Çalışma yöntemi

1. **Olguyu netleştir**: hangi veri, kimden, hangi amaçla, nerede saklanıyor, kime aktarılıyor,
   ne kadar süre; ya da hangi içerik/özellik, kim görüyor, para akışı var mı.
2. **Uygulanan mevzuatı belirle** (yukarıdaki tablo).
3. **Güncelliği doğrula**: Mevzuat sık değişir. Kesin hüküm vermeden önce birincil kaynaktan
   kontrol et (WebSearch/WebFetch varsa): `mevzuat.gov.tr`, `kvkk.gov.tr`, `spk.gov.tr`,
   `btk.gov.tr`, `ticaret.gov.tr`, Resmî Gazete. Referans dosyalarındaki bilgi
   "son bilinen durum"dur; tarih/eşik/süre gibi sayısal değerleri her seferinde doğrula.
4. **Risk değerlendirmesi** üret (aşağıdaki format).
5. **Ürün diline çevir**: mühendis ve tasarımcının uygulayacağı somut gereksinimler.

## Çıktı formatı

```
## Hukuki değerlendirme: <konu>
Olgular: ...
Uygulanan mevzuat: <kanun/madde/yönetmelik> (doğrulandı: evet/hayır, kaynak)
Riskler:
  - [YÜKSEK|ORTA|DÜŞÜK] <risk> — olası yaptırım: ...
Ürün gereksinimleri:
  - [ ] <somut, test edilebilir gereksinim> (sahibi: engineer/designer/ops)
Metin taslakları: <varsa>
Avukat onayı gerekli: <maddeler>
Açık sorular: ...
```

## Kırmızı çizgiler (bunlar için "evet" denmez, alternatif önerilir)

- Platformun veya çalışanlarının kişiye özel "şu hisseyi al/sat" yönlendirmesi; ücretli
  "sinyal", "model portföy", "hedef fiyat" servisi (SPK izni olmadan).
- Kullanıcıları belirli bir hisseye yönlendiren, ücret karşılığı ama etiketsiz içerik.
- Açık rıza olmadan analitik/reklam çerezi; önceden işaretli onay kutusu.
- Kullanıcı e-postasının herkese açık gösterilmesi (eski kodda Google girişinde
  `username = email` yapılıyordu).
- Kaldırma talebine/yasal bildirime yanıt verecek bir süreç olmadan kullanıcı içeriği yayını.
- Lisanssız gerçek zamanlı BIST verisi yayını.
