# Composer hukuki kararları ve metinleri (v2)

> **Bu belge hukuki görüş değildir.** Risk analizi ve metin taslağıdır. "Avukat onayı gerekli"
> diye işaretlenen maddeler yayına almadan önce Türkiye'de ruhsatlı bir avukata (bilişim +
> sermaye piyasası + fikri mülkiyet) onaylatılmalıdır.
>
> Kaynak tasarım: `docs/design/v2-composer-and-entities.md` §1.4 (MED), §1.6 (LEG), §6 (link
> önizleme), §9 açık sorular 5, 6, 7, 11.
> Hazırlanma: 2026-10-10 · legal-advisor (Claude). Bu tarihte bazı birincil kaynaklara
> (mevzuat.gov.tr, developers.giphy.com) ağ erişimi yoktu. Doğrulama durumu her maddede ayrıca yazıyor.

---

## Hukuki değerlendirme 1: Kısa "yatırım tavsiyesi değildir" metni

**Olgular:** Composer'ın altında her zaman görünen, kapatılamayan, `text-xs` bir satır. Tam
metne "Ayrıntılar" linki var. Aynı anahtar (`legal.disclaimer.short`) hisse hover kartında da
kullanılıyor (`[HC-03]`). Bu yüzden metin hem yazana hem okuyana uygun, nötr olmalı.

**Uygulanan mevzuat:** 6362 SPKn md. 37 (yatırım danışmanlığı izne bağlı yatırım hizmetidir) ve
md. 107/2 (bilgi bazlı piyasa dolandırıcılığı). Tam uyarı metni
`turkish-legal-compliance/references/sermaye-piyasasi.md` dosyasında.
(Doğrulandı: **hayır**. Madde numaraları referans dosyadaki son bilinen durumdan alındı. Ağ
kısıtı nedeniyle mevzuat.gov.tr'den bu oturumda kontrol edilemedi.)

**Karar:**
- Gönderi composer'ı (`post-inline`, `post-dialog`, `post-sheet`) ve hover kartı aynı kısa
  metni kullanır: `legal.disclaimer.short`.
- Yorum composer'ı için **ayrı ve daha kısa** bir anahtar kullanılır:
  `legal.disclaimer.comment`. Yorumlarda da "al/sat" içeriği yazılıyor. Detay sayfasının
  footer'ındaki tam metin, yazan kişi footer'a inmediği için yeterli değil. Satır yalnızca
  yorum composer'ı **odaklanıp genişlediğinde** görünür. Kapalı, tek satırlık durumda görünmez,
  böylece §1 "tek satır" tasarımı bozulmaz. (Tasarımdaki §1.6a "comment'te gösterilmez"
  kararını bu madde değiştirir.)
- "Ayrıntılar" linkinin hedefi kalıcı bir URL olmalı: `/yasal/yatirim-uyarisi`. İstenirse
  intercepting route ile dialog olarak açılabilir, ama URL doğrudan açıldığında tam sayfa
  olarak çalışmalı (paylaşılabilir ve kanıtlanabilir olsun).

**Riskler:**
- [ORTA] Kullanıcı içeriğinin platformun tavsiyesi gibi algılanması. Olası yaptırım: SPK'nın
  izinsiz yatırım danışmanlığı iddiası ve itibar riski. Uyarı metni tek başına koruma sağlamaz.
  Asıl koruma, platformun kendisinin tavsiye üretmemesidir.
- [DÜŞÜK] Uyarının yorumlarda hiç olmaması. Olası sonuç: tutarsızlık, şikayette savunma zayıflığı.

**Ürün gereksinimleri:**
- [ ] `legal.disclaimer.short` ≤ 120 karakter (link metni hariç). i18n testi uzunluğu
      doğrular. (sahibi: engineer)
- [ ] `post-*` varyantlarında metin ve "Ayrıntılar" linki her zaman DOM'da. Kapatma
      kontrolü yok (`[LEG-01]`). (sahibi: engineer)
- [ ] `comment` varyantı odaklanıp genişleyince `legal.disclaimer.comment` ve "Ayrıntılar"
      görünür. Kapalıyken DOM'da yoktur. Yeni kabul kriteri: `[LEG-06]`. (sahibi: engineer)
- [ ] `/yasal/yatirim-uyarisi` sayfası tam uyarı metnini içerir ve doğrudan URL ile 200 döner.
      (sahibi: engineer)
- [ ] Editör `aria-describedby` alanı uyarı satırının id'sini içerir (tasarımda
      `composer-disclaimer` olarak var). (sahibi: engineer)

**Metin taslakları:**

| Anahtar | TR | EN | Karakter (TR / EN) |
|---------|----|----|--------------------|
| `legal.disclaimer.short` | Paylaşımlar yazarlarının kişisel görüşüdür, yatırım tavsiyesi değildir. | Posts reflect their authors' personal views and are not investment advice. | 71 / 75 |
| `legal.disclaimer.comment` | Yorumlar kişisel görüştür, yatırım tavsiyesi değildir. | Replies are personal views, not investment advice. | 54 / 50 |
| `legal.disclaimer.more` | Ayrıntılar | Details | – |

Görünüm: `<metin> · Ayrıntılar`

İsteğe bağlı, önerilir: Uyarı satırının yanına ⓘ tooltip ile yazana hatırlatma
(`composer.legal.reminder`):
- TR: "Yanıltıcı bilgi yaymak ya da fiyatı etkilemeye çalışmak yasaktır ve suç olabilir."
- EN: "Spreading misleading information or trying to move prices is prohibited and may be a crime."

---

## Hukuki değerlendirme 2: Sponsorluk / işbirliği anahtarı ve gönderi etiketi

**Olgular:** Gönderi composer'ında her zaman görünen switch. Varsayılan kapalı ve hatırlanmıyor.
Açıksa gönderi kartında yazar adından önce bir etiket görünür. Yorumlarda anahtar yok.

**Uygulanan mevzuat:** 6502 sayılı Kanun md. 61 (örtülü reklam yasağı), Ticari Reklam ve Haksız
Ticari Uygulamalar Yönetmeliği, Reklam Kurulu'nun 2021/2 sayılı ilke kararı olan "Sosyal Medya
Etkileyicileri Tarafından Yapılan Ticari Reklam ve Haksız Ticari Uygulamalar Hakkında Kılavuz"
(Reklam Kurulu toplantısı 4 Mayıs 2021).
(Doğrulandı: **kısmen**. Kılavuzun varlığı ve tarihi ikincil kaynaklarla doğrulandı. Kılavuzdaki
ilkeler: reklam açık ve ayırt edilebilir olmalı; etiket arka plandan ayırt edilmeli, kolay
okunmalı; kullanıcı ilk karşılaştığında başka bir işlem yapmadan reklam olduğunu anlamalı; md.
7–10'daki ifadelerden en az biri kullanılmalı. Örnek ifadeler: "#Reklam", "#İşbirliği",
"#Ortaklık", "@X tarafından sağlandı". Bunlar ikincil kaynaklardan alındı. Kılavuzun resmî
metni ticaret.gov.tr'den bu oturumda açılamadı. md. 61 numarası **doğrulanmadı**.)

**Karar:**
- Yayındaki etiket: **"Reklam / İşbirliği"**. Kılavuzun örnek kelimelerini aynen içerir,
  Türkçedir ve tek bakışta anlaşılır.
- Anahtar etiketi menfaatin ne olduğunu tanımlar. Kullanıcı yalnızca para aldığında değil,
  hediye ve indirimde de açması gerektiğini bilmeli. Kılavuz bunları da kapsıyor.
- İngilizce arayüzde etikette Türkçe "Reklam" kelimesi de kalır. Kitle Türkiye'deki
  tüketicilerdir, Bakanlık denetimi Türkçe ifadeye bakar. (Doğrulanmadı. Avukat onayı gerekli.)
- **Sponsorlu hisse/kripto tanıtımı yasaklanır (açık soru 7'nin cevabı).** Anahtar açıkken
  editörde tanınmış bir cashtag varsa paylaşım engellenir. Sebebi: ücret karşılığı belirli bir
  sermaye piyasası aracını öne çıkarmak, etiketli olsa bile, SPKn md. 107/2 (bilgi bazlı
  manipülasyon) ve izinsiz yatırım danışmanlığı/reklam riskini büyütür. Ayrıca finansal ürün
  reklamı lisanslı kuruluşlarla sınırlıdır. Bu kombinasyon için "etiketlersen olur" denmez.
- Yorumlarda anahtar olmaması kabul edilebilir. Buna karşılık Kullanım Koşulları'nda yorumlarda
  her türlü ücretli tanıtım yasaklanır ve şikayet nedenleri listesine "Gizli reklam / ücretli
  tanıtım" eklenir.

**Riskler:**
- [YÜKSEK] Etiketsiz, ücretli hisse tanıtımı (pump). Olası yaptırım: SPKn md. 107/2 kapsamında
  hapis ve adli para cezası (ceza aralığı **doğrulanmadı**), SPK erişim engeli talebi ve
  platforma soruşturma. Kırmızı çizgi.
- [ORTA] Örtülü reklam. Olası yaptırım: Reklam Kurulu'ndan reklam veren ve etkileyiciye idari
  para cezası ve tedbiren durdurma. Tutarlar her yıl yeniden değerleme oranıyla güncelleniyor,
  güncel tutar **doğrulanmadı**. Platformun yayıncı olarak sorumluluğu sınırlı, ama etiketleme
  aracı sunmak ve moderasyon yapmak savunmayı güçlendirir.
- [ORTA] Cashtag engeli kullanıcıyı anahtarı kapalı bırakmaya itebilir. Bu, Koşullar'daki yasak,
  şikayet nedeni ve moderasyonla dengelenir.

**Ürün gereksinimleri:**
- [ ] Gönderi kartında etiket yazar adından önce gelir (DOM sırası, `[LEG-03]`). Metin gövdesi
      kısaltıldığında ("devamını gör") da görünür kalır. Yalnızca tooltip ya da ikon olamaz:
      metin her zaman görünür. (sahibi: engineer/designer)
- [ ] Etiket kontrast açısından WCAG AA'yı geçer ve içerik metninden ayırt edilir (zemin rengi
      ya da çerçeve). Gönderi gövdesinden küçük punto kullanılmaz. (sahibi: designer)
- [ ] Anahtar açık ve editörde tanınmış cashtag varsa Paylaş `aria-disabled` olur ve
      `composer.sponsored.cashtagBlocked` hatası görünür. Sunucu da aynı kuralı uygular, 422
      döner. Yeni kabul kriteri: `[LEG-07]`. (sahibi: engineer)
- [ ] `isSponsored` alanı gönderiyle saklanır. Gönderi düzenleme özelliği gelirse etiketin
      kaldırılması audit log'a yazılır. (sahibi: engineer)
- [ ] Admin panelinde moderatör bir gönderiye zorla "Reklam / İşbirliği" etiketi ekleyebilir.
      (sahibi: engineer/ops)
- [ ] Şikayet nedenlerine "Gizli reklam / ücretli tanıtım" eklenir. (sahibi: engineer/ops)
- [ ] Gönderi detay sayfasında `<title>`/OG başlığı sponsorlu gönderide "[Reklam]" ile başlar.
      (sahibi: engineer)

**Metin taslakları:**

| Anahtar | TR | EN |
|---------|----|----|
| `composer.sponsored.label` | Bu gönderi reklam veya işbirliği içeriyor | This post is an ad or paid collaboration |
| `composer.sponsored.help` | Bir marka ya da kişiden para, hediye, indirim veya başka bir menfaat aldıysan aç. Gönderinin başında "Reklam / İşbirliği" etiketi görünür. | Turn on if you received money, gifts, discounts or any other benefit from a brand or person. A "Reklam / İşbirliği" (Ad / Collaboration) label will appear at the top of your post. |
| `post.sponsoredLabel` | Reklam / İşbirliği | Ad / Collaboration (Reklam) |
| `composer.sponsored.cashtagBlocked` | Hisse, kripto ya da başka yatırım aracı içeren gönderiler reklam/işbirliği olarak paylaşılamaz. | Posts mentioning stocks, crypto or other investment instruments can't be shared as ads or collaborations. |

---

## Hukuki değerlendirme 3: GIF sağlayıcı ve KVKK yurt dışı aktarım

**Olgular:**
- GIF araması kullanıcı yazarken (debounce 300 ms) yapılıyor. Seçici açılınca "Popüler" listesi
  yükleniyor. Seçilen GIF gönderide okuyuculara gösteriliyor.
- Sağlayıcı doğrudan tarayıcıdan çağrılırsa ABD merkezli sağlayıcıya şunlar gider: kullanıcının
  IP adresi, User-Agent ve olası çerezler, arama sorgusu, sağlayıcının istediği kullanıcı kimliği
  (`random_id`/`customer_id`). Gönderideki GIF sağlayıcının CDN'inden yükleniyorsa her
  **okuyucunun** IP adresi de gider.
- **Tenor seçenek değil:** Google, Tenor API'sini üçüncü taraf geliştiricilere 30 Haziran 2026
  itibarıyla kapattı (yeni anahtar verilmesi 13 Ocak 2026'da durmuştu). (Doğrulandı: ikincil
  kaynaklarla, Google'ın resmî duyurusu açılamadı.)
- **GIPHY:** Resmî geliştirici dokümanları (arama özeti üzerinden okundu, sayfa doğrudan
  açılamadı) **API çağrılarının ve medya URL'lerinin proxy'lenmesini yasaklıyor**, istemciden
  çağrı istiyor, onay olmadan medya önbelleğe almayı da yasaklıyor. Yani GIPHY ile "sunucu
  proxy'si" API koşullarına aykırı olur. (Doğrulandı: kısmen, güncel ToS'u imzadan önce
  okuyun.)
- **KLIPY:** Sunucu taraflı kullanım ve `customer_id` parametresi var. Proxy, önbellek ve veri
  saklama koşulları **doğrulanmadı** (resmî şartlar bulunamadı).

**Uygulanan mevzuat:** KVKK md. 9 (2024 değişikliği). Yeterlilik kararı yoksa uygun güvence
gerekir, ör. standart sözleşme. Standart sözleşme imzadan sonra 5 iş günü içinde Kurum'a
bildirilir. Arızi aktarım istisnası sürekli hizmette kullanılamaz. KVKK md. 10 (aydınlatma),
md. 18 (idari para cezası).
(Doğrulandı: 5 iş günü kuralı ve bildirim modülü ikincil kaynaklarla doğrulandı. Türkiye
için ABD'ye yönelik yeterlilik kararı olmadığı **doğrulanmadı**. Ceza tutarları
**doğrulanmadı**, her yıl güncelleniyor.)

**Karar: en az riskli uygulama**
1. Sunucu proxy'sine izin veren bir sağlayıcı seçilir (aday: KLIPY, şartları doğrulanmalı).
   Tarayıcı yalnızca `/api/gif/search` ve `/api/gif/trending` uçlarımızı çağırır.
2. Proxy sağlayıcıya **yalnızca** arama metnini, dili ve bölgeyi gönderir. Kullanıcının IP'si,
   `X-Forwarded-For`, User-Agent, çerez ve oturum bilgisi iletilmez. Sağlayıcı kullanıcı
   kimliği istiyorsa sabit bir uygulama kimliği ya da kullanıcıyla eşleştirilemeyen, her istekte
   ya da günlük değişen rastgele bir değer gönderilir. `firebaseUid` ya da onun hash'i
   **gönderilmez**, çünkü hash de kişisel veridir.
3. Seçilen GIF paylaşım anında bizim depomuza kopyalanır (ya da kendi görsel proxy'mizden
   sunulur). Okuyucunun tarayıcısı sağlayıcı alan adına hiç istek atmaz. Bunu yapmadan önce
   sağlayıcının lisansının kopyalamaya izin verdiği kontrol edilmeli.
4. Arama sorguları bizim log'larımızda kullanıcı kimliğiyle birlikte saklanmaz. Hız sınırı için
   kullanıcı başına sayaç tutulabilir, sorgu metni tutulmaz.

Bu yapıda sağlayıcıya kimliği belirlenebilir bir kişiye ait veri gitmediği için md. 9 aktarımı
**büyük olasılıkla oluşmaz**. Kalan risk şudur: kullanıcı arama kutusuna kişi adı gibi bir veri
yazabilir. Bu düşük bir risktir. Bu "aktarım yok" yorumu bir değerlendirmedir: **Avukat onayı
gerekli.**

**GIPHY seçilirse (istemciden doğrudan çağrı zorunlu):** Kullanıcı IP'si ABD'ye gider. Bu sürekli
bir aktarımdır, md. 9 güvencesi gerekir. GIPHY'nin Kurul'un standart sözleşmesini imzalaması
gerçekçi değil. Kullanıcının "GIF ekle" tıklamasını açık rızaya dayalı arızi aktarım saymak
zayıf bir yorumdur. Risk: **YÜKSEK**. Önerilmez. Mecbur kalınırsa en azından: seçici ilk kez
açıldığında bir bildirim ve onay ekranı göstermek, aydınlatma metninde açıkça yazmak, okuyucu
tarafında GIF'leri yine kendi proxy'mizden sunmak (GIPHY koşullarına aykırı olabilir) gerekir.
Avukat onayı olmadan yayına alınmaz.

**Riskler:**
- [YÜKSEK] Tarayıcıdan doğrudan sağlayıcı çağrısı ve okuyucuya sağlayıcı CDN'inden GIF yüklemek.
  Olası yaptırım: KVKK md. 18 idari para cezası, Kurul şikayeti, md. 9 bildirim eksikliği.
- [ORTA] Proxy'li yapıda sağlayıcı sözleşmesinin proxy'ye ya da kopyalamaya izin vermemesi.
  Olası sonuç: API anahtarının kapatılması, telif talebi.
- [DÜŞÜK] Anonim proxy ile kalan risk: sorgu metninde kişisel veri.

**Ürün gereksinimleri:**
- [ ] Tarayıcıdan GIF sağlayıcı alan adına hiçbir istek gitmez. E2E testi: seçici açılıp arama
      yapılır, GIF'li gönderi akışta gösterilir; network kaydında yalnızca bizim alan
      adlarımız olmalı. (sahibi: engineer)
- [ ] Proxy'den çıkan istekte `X-Forwarded-For`, `Cookie`, kullanıcı `User-Agent`,
      `firebaseUid` yok. Birim testi: giden istek başlıkları ve parametreleri doğrulanır.
      (sahibi: engineer)
- [ ] `[MED-08]` (reduced motion) statik kare de kendi depomuzdan/proxy'mizden gelir.
      (sahibi: engineer)
- [ ] GIF arama sorgusu uygulama log'larına yazılmaz. (sahibi: engineer)
- [ ] "Powered by …" atfı sağlayıcı koşullarına göre gösterilir. (sahibi: designer)
- [ ] Aydınlatma metnine bir satır eklenir: "GIF aramaların, kimlik bilgin ve IP adresin
      olmadan GIF sağlayıcısına iletilir." (sahibi: ops/legal)
- [ ] Sağlayıcının API şartları (proxy, önbellek, kopyalama, saklama) sözleşme öncesi yazılı
      olarak teyit edilir ve `docs/legal/` altına not edilir. (sahibi: ops)

---

## Hukuki değerlendirme 4: Link önizleme (OG) ve telif (FSEK)

**Olgular:** Gönderi oluşturulurken sunucu ilk dış URL'nin OG verisini bir kez çeker: başlık,
açıklama, görsel, site adı, favicon. Bu veri gönderiyle saklanır, görsel kendi depomuzdan
sunulur.

**Uygulanan mevzuat:** 5846 FSEK md. 22 (çoğaltma), md. 25 (umuma iletim), md. 36 (günlük
haberler), md. 84 (haksız rekabet); TTK md. 54–55 (haksız rekabet); 5651 md. 5 (yer
sağlayıcının uyar-kaldır yükümlülüğü).
(Doğrulandı: **kısmen**. md. 36 ve günlük haberlerin çoğunlukla eser sayılmadığı, kaynak
göstermeden ve sistematik olarak haber kopyalamanın ise haksız rekabet sayılabildiği ikincil
kaynaklarla doğrulandı. Madde metinleri mevzuat.gov.tr'den açılamadı. Link önizleme ya da küçük
resim hakkında Yargıtay kararı **bulunamadı**.)

**Değerlendirme:**
- **Başlık:** Kısa haber başlıkları çoğunlukla eser düzeyinde özgünlük taşımaz. Link ve kaynakla
  birlikte gösterilmesi düşük risklidir.
- **Açıklama:** Yalnızca sitenin paylaşım için kendisinin koyduğu `og:description` /
  `meta description` kullanılır. Sayfa gövdesinden metin alınmaz. Sitenin bu alanı paylaşım
  için sunması, örtülü izin için pratik bir dayanaktır, ama kesin bir hukuki kural değildir.
- **Görsel:** En riskli kısım. Fotoğraf eser olarak korunur. Küçük resmi kendi depomuza
  kopyalamak çoğaltmadır, göstermek umuma iletimdir. Haber istisnası fotoğrafı kapsamayabilir.
  Risk, yalnızca `og:image` kullanıp küçültülmüş kopya saklayarak ve hızlı kaldırma süreciyle
  azaltılır. Tam olarak ortadan kalkmaz. **Avukat onayı gerekli.**
- Önizleme sunucumuzda otomatik üretildiği için bu veride platform yer sağlayıcıdan çok içerik
  sağlayıcıya yaklaşır. Kaldırma talebine hızlı yanıt bu yüzden zorunludur.

**Riskler:**
- [ORTA] og:image küçük resminin saklanması ve gösterilmesi. Olası sonuç: FSEK md. 68 tazminat
  talebi (madde numarası **doğrulanmadı**), ihtarname, kaldırma talebi.
- [DÜŞÜK] Başlık ve kısa açıklama. Olası sonuç: kaldırma talebi.
- [ORTA] Haber ajansı içeriğinin sistematik ve kaynaksız gösterilmesi. Olası sonuç: haksız
  rekabet davası. Kaynak (host) her zaman gösterilerek azaltılır.

**Ürün gereksinimleri (sınırlar):**
- [ ] Yalnızca OG/Twitter/`meta` etiketleri okunur. Sayfa gövdesinden metin ya da görsel
      kazınmaz. OG başlığı yoksa kart oluşmaz (tasarımda var). (sahibi: engineer)
- [ ] Başlık en fazla 120, açıklama en fazla 200 karakterle **saklanır** (UI 2 satırda keser).
      (sahibi: engineer)
- [ ] Görsel yalnızca `og:image`/`twitter:image`'dan alınır. En fazla 600 px genişliğe
      küçültülür, yeniden kodlanır, EXIF/metadata silinir. Orijinal çözünürlük saklanmaz.
      (sahibi: engineer)
- [ ] Kart her zaman kaynağı (host) gösterir ve orijinal URL'ye link verir. "Tam metni oku"
      gibi içerik çoğaltan bir görünüm yoktur. (sahibi: designer/engineer)
- [ ] Alan adı engelleme listesi (admin panelinden): listedeki alanlar için önizleme
      üretilmez, mevcut önizlemelerin görseli kaldırılabilir. (sahibi: engineer/ops)
- [ ] Şikayet akışında "Telif hakkı / önizleme" nedeni bulunur. Kaldırma, gönderiyi silmeden
      yalnızca önizleme görselini ya da kartı kaldırabilir. (sahibi: engineer/ops)
- [ ] Yanıt süresi hedefi: telif bildirimine en geç 24 saat içinde işlem. 5651 md. 9 süreleri
      ayrıca `icerik-5651.md`'ye göre doğrulanmalı. (sahibi: ops)
- [ ] Hedef sayfa `robots` meta etiketinde `noarchive` ya da `noimageindex` taşıyorsa görsel
      saklanmaz, yalnızca başlık ve host gösterilir. (sahibi: engineer)

---

## Avukat onayı gerekli
1. Kısa uyarı metinleri ve tam metnin son hâli (`/yasal/yatirim-uyarisi`).
2. Sponsorlu gönderide cashtag yasağı politikası ve Kullanım Koşulları'ndaki ücretli tanıtım
   yasağı.
3. İngilizce arayüzde "Reklam" kelimesinin korunması gerekip gerekmediği.
4. GIF proxy yapısında "md. 9 aktarımı yok" yorumu. GIPHY seçilirse aktarım dayanağı.
5. og:image küçük resminin saklanması ve gösterilmesi (FSEK).

## Açık sorular
- GIF sağlayıcı: KLIPY'nin (ya da alternatifin) güncel API şartları proxy'ye, önbelleğe ve
  kopyalamaya izin veriyor mu? Sözleşme kimin adına imzalanacak?
- Gönderi düzenleme özelliği v2'de var mı? Varsa sponsorluk etiketinin yayından sonra
  kaldırılmasına izin verilecek mi?
- Telif bildirimleri için hangi kanal kullanılacak (e-posta adresi, form)? Admin panelinde
  önizleme kaldırma yetkisi kimde olacak?

## Kaynaklar (bu oturumda kullanılan)
- Tenor API kapanışı: [9to5google](https://9to5google.com/2026/06/30/google-tenor-api-gif-updates/),
  [PC Gamer](https://pcgamer.com/hardware/google-kills-yet-another-api-shutting-out-all-non-google-platforms-from-favoured-gif-database/),
  [AlternativeTo](https://alternativeto.net/news/2026/7/google-discontinues-tenor-gif-api-for-developers-impacting-discord-x-whatsapp-and-bluesky/)
- GIPHY API kuralları: [developers.giphy.com best practices](https://developers.giphy.com/docs/api/best-practices/),
  [endpoint docs](https://developers.giphy.com/docs/api/endpoint)
- KLIPY (ikincil): [Zuplo](https://zuplo.com/learning-center/klipy-api),
  [Zulip GIF gizlilik notu](https://chat.fhir.org/help/animated-gifs)
- Etkileyici kılavuzu: [IAB TR PDF](https://iabtr.org/wp-content/uploads/2024/06/Sosyal-Medya-Etkileyicileri-Tarafindan-Yapilan-Ticari-Reklam-ve-Haksiz-Ticari-Uygulamalar-Hakkinda-Kilavuz1062021101250.pdf),
  [Webrazzi](https://webrazzi.com/2021/05/06/ticaret-bakanligi-influencerlara-yonelik-yeni-bir-kilavuz-yayinladi/),
  [Hukuki Haber](https://www.hukukihaber.net/reklam-ve-isbirligi-etiketi-zorunluluk-nerede-baslar-keyfilik-nerede-biter-1)
- KVKK standart sözleşme bildirimi: [Erdem & Erdem](https://www.erdem-erdem.av.tr/bilgi-bankasi/standart-sozlesme-bildirim-modulu-hakkinda-kamuoyu-duyurusu),
  [Alomaliye](https://www.alomaliye.com/2024/10/30/kvkk-standart-sozlesme-bildirim-modulu/)
- FSEK md. 36 ve haberler: [Hukuki Haber](https://www.hukukihaber.net/gunluk-olaylara-ait-haberler-eser-niteliginde-midir),
  [Lexpera](https://www.lexpera.com.tr/literatur/kitaplar/6-basin-iktibaslari-978-605-152-270-8-1)
