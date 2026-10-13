# Hisse sayfası verisi ve hisse listesi güncelliği

Tarih: 2026-10-13 · Durum: karar bekliyor · **Hukuki kısımlar bilgilendirme amaçlıdır; yayından önce avukat onayı gerekir.**

**Araştırma sınırı:** Ortamdan KAP ve Borsa İstanbul sitelerine doğrudan erişilemedi; bulgular web aramasına dayanır. "(tahmin)" ve "(doğrulanmadı)" etiketli maddeler yazılı teyit ister. Kritik soruların muhatabı: Borsa İstanbul veri ekibi (vyk-marketing@borsaistanbul.com) ve KAP/MKK (kapdestek@mkk.com.tr).

## 1. Fiyatsız hisse sayfasında ne gösterilebilir

Temel bulgular:
- Borsa İstanbul verisini (gerçek zamanlı ya da gecikmeli) yayınlamak için dağıtıcı ya da alt dağıtıcı lisansı gerekir; alt dağıtıcı, yetkili bir dağıtıcı kurum üzerinden olur ([Borsa İstanbul SSS](https://borsaistanbul.com/sss/veri-dagitim-ve-endeks-lisanslama), [dağıtıcı listesi](https://borsaistanbul.com/veri-yayini/veri-dagitici-kuruluslar)). Gecikmeli veri de lisans kapsamındadır; "gecikmeli = serbest" varsayılamaz. Bir sayfa gecikmeli verinin alt dağıtıcıda kullanıcı başı ücret dışında kaldığını ima ediyor, ama metin kesik (doğrulanmadı). Güncel ücret tarifesi bulunamadı; son bulunan duyuru 2022'ye ait. Maliyet: bilinmiyor (tahmin: sabit aylık/yıllık lisans + dağıtıcı ücreti, küçük platform için anlamlı bir gider).
- KAP için herkese açık, belgelenmiş bir geliştirici API'si ya da kullanım koşulları bulunamadı. Topluluk araçları (ör. [pykap](https://pypi.org/project/pykap)) KAP sitesini ayrıştırıyor; bu resmi izin anlamına gelmez. Mevcut script de Pazarlar sayfasındaki gömülü veriyi ayrıştırıyor, yani **sayfa değişirse kırılır ve KAP'ın otomatik erişime bakışı yazılı doğrulanmadı**. Düşük sıklık, tanımlı User-Agent ve yalnız kod/unvan almak riski azaltır ama sıfırlamaz.
- XBRL standardı lisanssızdır ([MKK sunumu](https://www.mkk.com.tr/tr-tr/haberler/Documents/Kap-4-0-PYS-Sunumu.pdf)); bu, KAP'taki bildirim/finansal tablo içeriğinin yeniden yayın hakkı hakkında bir şey söylemez.
- SPK: sosyal medyada izinsiz yatırım yönlendirmesi ve grup üzerinden yönlendirme SPK'nın açık hedefidir; piyasa bozucu eylemde 6362 m.107 (3-5 yıl hapis) ve geçici işlem yasağı uygulanmıştır ([SPK 2020 duyurusu](https://spk.gov.tr/duyurular/basin-duyurulari/2020/basin-aciklamasi-04-06-2020), [NTV](https://www.ntv.com.tr/ntvpara/spkden-10-kisiye-islem-yasagi,MAlb6CcUeEea8m1-aH-0CA)). Kullanıcı gönderisi tek başına platformu sorumlu kılmaz (tahmin), ama platform kendi adına "al/sat" izlenimi veren sıralama/etiket üretirse risk artar.
- Rakipler: Fintables sayfalarında Borsa İstanbul verisinin abone lisansıyla 15 dk gecikmeli ya da eşanlı sunulduğunu belirtir ([örnek](https://fintables.com/araci-kurumlar/TIB/akis)); Foreks/Bigpara 15 dk gecikmeli veriyi Foreks üzerinden verir ([Bigpara](https://bigpara.hurriyet.com.tr/haberler/borsa-istanbul-haberleri/)); Midas aracı kurum olarak kendi lisansıyla gerçek zamanlı verir ([Midas](https://getmidas.com/en)). Stocktwits/Investing için BIST koşulları doğrulanmadı. Ortak desen: fiyat ya lisanslı ya aracı kurum zemininde; fiyatsız yalnız bizim gibi topluluk ürünleri.

## 2. Kalem tablosu (M2 hisse sayfası)

| Kalem | Kaynak | Yasal risk | Maliyet | Otomasyon | Öneri |
|---|---|---|---|---|---|
| Kod, unvan, pazar | KAP Pazarlar (mevcut) | Düşük (kamuya açık olgu) | 0 | Var | **Şimdi** |
| KAP şirket sayfası linki | KAP URL (kod/oid ile) | Çok düşük (link) | 0 | Kolay | **Şimdi** |
| TradingView sembol linki | `tradingview.com/symbols/BIST-KOD` | Çok düşük (dış link, widget yok) | 0 | Kolay | **Şimdi** |
| Şirket IR sayfası linki | Elle/KAP şirket sayfası | Düşük | Emek | Zor (elle) | Sonra |
| Sektör | KAP şirket bilgisi (doğrulanmadı) | Düşük | 0 | Orta (ayrıştırma) | Şimdi (elle toplu yükleme) |
| Endeks üyeliği (BIST 30/100) | Borsa İstanbul çeyreklik revizyon duyurusu | **Orta**: endeks üyelik listesi için endeks lisansı gerekip gerekmediği belirsiz (doğrulanmadı) | 0, lisans çıkarsa ? | Elle, çeyrekte 1 | Sonra (lisans teyidiyle) |
| Halka arz tarihi | KAP / SPK bülteni | Düşük | 0 | Orta | Sonra |
| KAP bildirimi başlık + link | KAP (API yok/ belirsiz) | Orta: ayrıştırma izni belirsiz; link vermek düşük | 0 | Kırılgan | Sonra (KAP'tan yazılı teyitle); şimdilik yalnız KAP linki |
| Bildirim/finansal tablo içeriği, temel oranlar | KAP, XBRL | **Yüksek** (yeniden yayın hakkı belirsiz, oran hesabı = türev veri/yorum) | 0 + emek | Zor | Sonra |
| 15 dk gecikmeli fiyat | Lisanslı dağıtıcı + alt dağıtıcı sözleşmesi | Düşük (lisanslıysa) | **Bilinmiyor**, teklif alınmalı | API | Sonra |
| Gönderi/takipçi sayısı | Kendi DB | Düşük | 0 | Var | **Şimdi** |
| "En çok konuşulanlar" | Kendi DB (gönderi sayısı, zaman penceresi) | Düşük-orta: salt sayım; tavsiye gibi sunulmamalı; manipülasyon (spam ile öne çıkarma) önlemi şart | 0 | Var | **Şimdi**, "tavsiye değildir" notuyla |
| Boğa/ayı oylaması | Kendi DB | **Orta**: "topluluk görüşü" dili ok; "al/sat sinyali" dili yasak; sahte hesapla manipülasyon riski | 0 | Var | Sonra (moderasyon/anti-sahte hesap hazır olunca) |
| Hedef fiyat, sinyal, öneri | - | Yüksek (izinsiz danışmanlık) | - | - | **Asla** |
| TradingView ücretsiz widget (BIST) | - | BIST göstermiyor | - | - | Asla (işe yaramaz) |
| Scraping ile fiyat | Bigpara, Investing vb. | Yüksek (ihlal) | - | - | **Asla** |

Zorunlu uyarılar (her hisse yüzeyinde): "Burada yer alan içerikler kullanıcılar tarafından üretilir, yatırım tavsiyesi değildir"; fiyat eklenince "Veriler 15 dk gecikmelidir. Kaynak: …" (bkz. `turkish-legal-compliance`, sermaye-piyasasi.md §5). Yatırım danışmanlığı yalnız yetkili kuruluşlarca verilebilir; platform kullanıcı görüşüne aracılık eder.

## 3. Hisse listesini güncel tutma

- **Yeni halka arz/işlem görmeye başlama:** KAP Pazarlar yöntemi pratikte yeterli: şirket işlem görmeye başlayınca pazar listesine girer. Halka arz tarihi ve onay için ek kaynak: SPK haftalık bülteni (tahmin: ayrıştırması elle). Mevcut `--max-new=15` koruması uygun.
- **Kottan çıkma, kod/unvan/pazar değişikliği:** Mevcut betik bunları yalnız raporluyor. Öneri: KAP listesinden düşenler **silinmesin**, `isActive=false` + `delistedAt` ile işaretlensin (gönderiler bağlı). Unvan/pazar değişimi için `companyName`/`market` güncellensin, eski unvan loga yazılsın. Kod değişimi (ticker) yeni kayıt gibi görünür; otomatik eşleme yok, yinelenen unvan raporu ile elle `previousTicker` verilsin. Toplu düşüş eşiği (ör. >10) olursa uygulama durdurulsun, KAP yapısı bozulmuş olabilir.
- **Sektör/endeks:** Endeksler çeyreklik revize edilir (Oca/Nis/Tem/Eki; örn. 2026 Q3 ve Q4 değişiklikleri haberlerde, resmi duyuru teyidi gerekir: [Q2 duyurusu](https://borsaistanbul.com/en/announcement/15391/borsa-istanbul-announces-constituent-changes-bist-stock-indices-second-quarter-2026), [Q3](https://www.cnbce.com/borsa/borsa-istanbul-ucuncu-ceyrek-endeks-revizyonlarini-duyurdu-h31934)). Çeyrekte bir elle/yarı otomatik güncelleme yeterli. Sektör nadiren değişir; ilk yükleme + aylık rapor.
- **Sıklık önerisi:** KAP senkronu **haftalık kalsın** (mevcut), çünkü maliyet düşük (tahmin: işin süresi ~1-2 dk, ayda ~10 dk, ücretsiz kota içinde) ve halka arz görünürlüğü 1 haftadan geç olmaz. Aylık, kullanıcının istediği "analiz" için **rapor** olarak üretilsin: ayın ilk haftasında workflow özeti (yeni, düşen, unvan/pazar değişen) bir issue/özet olarak insana sunulsun; endeks/sektör çeyrekte bir elle. Aylık-yalnız çalıştırma yeni halka arzı 4 hafta geciktirir; önerilmez.
- **Veri modeli eklemeleri (Stock):**
  - `market String?` (YILDIZ PAZAR / ANA PAZAR / ALT PAZAR / YAKIN İZLEME; ya da enum)
  - `sector String?`
  - `indices String[]` (örn. `["BIST30","BIST100"]`; lisans teyidine kadar iç kullanım)
  - `isActive Boolean @default(true)`
  - `listedAt DateTime?` (mevcut `marketEntryDate` ile birleştir/yeniden adlandır)
  - `delistedAt DateTime?`
  - `kapUrl String?`, `ipUrl String?` (IR sayfası, ileride)
  - `previousTickers String[]` (kod değişimi geçmişi)
  - `lastSyncedAt DateTime`

## 4. M2 önerisi

**İlk sürüm (yasal, 0 TL):** ticker, unvan, pazar, (sektör, yüklenebilirse), KAP şirket sayfası ve TradingView sembol linki, gönderi ve takipçi sayısı, "en çok konuşulanlar" (gönderi sayısına göre), tavsiye değildir uyarısı, kottan çıkan hisse için "işlem görmüyor" etiketi.
**Sonra:** endeks üyeliği (lisans teyidi), KAP bildirim başlık+link (KAP yazılı teyidi), halka arz tarihi, boğa/ayı oylaması (moderasyon hazır olunca), 15 dk gecikmeli fiyat (lisanslı dağıtıcıdan teklif), IR linki.
**Asla:** hedef fiyat/sinyal, scraping ile fiyat, lisanssız widget/veri.

## Kullanıcının vermesi gereken kararlar

1. Aylık senkron yerine "haftalık senkron + aylık rapor" önerisi kabul mü?
2. Kottan çıkanlar `isActive=false` ile saklansın mı (öneri: evet)?
3. Borsa İstanbul'a (veri ekibi) ve KAP/MKK'ya yazılı soru gönderilsin mi: gecikmeli veri/alt dağıtıcı koşulları, endeks üyeliği gösterimi, KAP bildirimlerinin başlık+link olarak otomatik gösterimi ve sayfa ayrıştırma izni?
4. Gecikmeli fiyat için Foreks/Matriks/Rasyonet'ten teklif alınsın mı, ve aylık bütçe tavanı nedir?
5. Boğa/ayı oylaması ilk sürümde mi, moderasyon sonrası mı?
6. Sektör verisi ilk kez elle mi yüklenecek (kim, hangi kaynak)?
7. Avukat onayı: uyarı metinleri, "en çok konuşulanlar" ve oylama dili, KAP/Borsa İstanbul marka/ad kullanımı.
