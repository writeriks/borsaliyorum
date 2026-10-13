# Giriş, kayıt ve onboarding: hukuki kararlar ve metinler (v2, S5)

> **Bu belge hukuki görüş değildir.** Risk analizi ve metin taslağıdır. "Avukat onayı gerekli"
> diye işaretlenen maddeler yayına almadan önce Türkiye'de ruhsatlı bir avukata (bilişim + KVKK)
> onaylatılmalıdır.
>
> İncelenen dal: `claude/v2-s5`. Dosyalar: `src/features/auth/**`, `src/app/[locale]/(auth)/**`,
> `src/app/api/auth/**`, `src/lib/auth/cookies.ts`, `messages/{tr,en}.json` (`auth.*`),
> `prisma/schema.prisma` (`User.noticeVersion`, `noticeAcknowledgedAt`, `ageConfirmedAt`,
> `ConsentEvent`).
> Hazırlanma: 2026-10-10 · legal-advisor (Claude). Bu oturumda mevzuat.gov.tr ve lexpera.com.tr
> açılamadı (DNS hatası). Doğrulama yalnızca web araması sonuçlarıyla yapıldı; her maddede durum
> ayrıca yazıyor.

---

## 0. Olgular (koddan)

| Konu | Kodda ne var |
|------|--------------|
| Kayıt | `/kayit`: e-posta + şifre ya da "Google ile devam et". Firebase hesabı **bu adımda** oluşur (e-posta, şifre özeti, Google UID; Firebase/Google ABD). Doğrulama e-postası hemen Firebase tarafından gönderilir. |
| Giriş | `/giris`: aynı form. **Google ile ilk kez giren kişinin hesabı da burada oluşur.** Sayfada aydınlatma linki yok. |
| Onboarding | `/hos-geldin`: kullanıcı adı, görünen ad (Google adından önerilir), zorunlu 18+ kutusu, zorunlu "Aydınlatma Metni'ni okudum" kutusu, isteğe bağlı ve işaretsiz pazarlama kutusu. `User` satırı ilk kez burada yazılır. |
| Kayıt kanıtı | `User.noticeVersion` + `noticeAcknowledgedAt`, `User.ageConfirmedAt`. Pazarlama izni verildiyse `ConsentEvent(kind=marketing_email, granted=true, textVersion, source=signup)`. Verilmediyse satır yazılmıyor. |
| Log | `ContentEvent session_start` + IP (şifreli), 5651 amaçlı. |
| Çerezler | `__session`: HttpOnly, Secure, SameSite=Lax, 14 gün, birinci taraf, oturum. `__Host-csrf`: HttpOnly, Secure, SameSite=Strict, 2 saat, CSRF koruması. Dil çerezi yok (`localeCookie: false`). Tema `localStorage`'da, sunucuya gitmiyor. Analitik/reklam SDK'sı yok. Firebase istemcisi `inMemoryPersistence` ile çalışıyor. |
| Aydınlatma sayfası | Link `/yasal/kvkk`. **Bu dalda sayfa yok** ("ayrı dilimde yayımlanacak"). Link şu an 404 veriyor. |
| Kullanım Koşulları | Footer'da link var. Kayıtta kabul alınmıyor, kabul kaydı tutulmuyor. |
| Hesap silme | Yok. |

---

## Hukuki değerlendirme 1: Çerezler (`__session`, `__Host-csrf`)

**Olgular:** Yukarıdaki tablo. İkisi de birinci taraf. İkisi de yalnızca kullanıcının istediği
hizmet (giriş yapmış kalmak) ve güvenlik (CSRF) için var. Reklam, analitik ya da profilleme yok.

**Uygulanan mevzuat:** KVKK md.5/2 (c) sözleşmenin ifası ve (f) meşru menfaat; md.10 aydınlatma.
KVKK "Çerez Uygulamaları Hakkında Rehber" (son hali 20.06.2022). Rehbere göre bir çerez iki
durumda açık rıza gerektirmez: (A) tek amacı ağ üzerinden iletişimi teknik olarak sağlamaksa ya
da (B) kullanıcının açıkça istediği hizmet için kesinlikle gerekliyse. Oturum ve güvenlik
çerezleri genelde (B) kapsamında sayılır.
(Doğrulandı: **kısmen**. Rehberin varlığı ve ölçütleri ikincil kaynaklardan görüldü. kvkk.gov.tr
metni açılamadı.)

**Karar:**
- `__session` ve `__Host-csrf` **zorunlu çerezdir**. Açık rıza gerekmez.
- **Çerez bannerı şu an gerekmez.** Banner'ı yalnızca zorunlu çerez için göstermek, kullanıcıya
  gerçekte olmayan bir seçim sunar ve yanıltıcı olur.
- **Aydınlatma yine gerekir.** Zorunlu çerez de kişisel veri işler (oturum kimliği → hesap). Bu
  yüzden bir "Çerez Politikası" bölümü (aydınlatma metninin içinde ya da ayrı sayfa) ve footer'da
  kalıcı link olmalı.
- Firebase popup akışı `<proje>.firebaseapp.com` iframe'ini ve Google hesap sayfasını açar.
  Bu alanlardaki depolama, kullanıcının başlattığı giriş için gerekli. Çerez politikasında
  "üçüncü taraf, zorunlu, yalnızca Google ile girişte" diye yazılır.
- Tema tercihi `localStorage`'da ve sunucuya gitmiyor. Kullanıcının kendisi seçtiği için risk düşük.
  Çerez politikasında "cihazında saklanan tercih" diye bir satırla anılır.
- **Tetikleyici:** Analitik (Vercel Analytics, PostHog, GA vb.), TradingView widget'ı, reklam
  pikseli ya da gömülü içerik eklendiği gün banner zorunlu hale gelir (eşit görünürlükte
  "Kabul et / Reddet", rıza yokken script yüklenmez). Bu, ilgili PR'ın `legal-advisor`
  kapısında kontrol edilir.

**Riskler:**
- [DÜŞÜK] Zorunlu çerezler için aydınlatma eksikliği. Olası yaptırım: KVKK md.18 aydınlatma
  ihlali idari para cezası (2026 için bilinen aralık 85.437 TL – 1.709.200 TL; **doğrulanmadı**,
  ikincil kaynak).
- [ORTA, ileride] Analitik ya da widget'ın banner olmadan eklenmesi. Bu bir kırmızı çizgi.

**Ürün gereksinimleri:**
- [ ] Çerez politikası bölümünde şu tablo var: ad, sağlayıcı, amaç, süre, tür (sahibi: ops/legal).
- [ ] Footer'da "Çerez Politikası" linki (sahibi: engineer).
- [ ] Test: anonim ziyaretçi `/akis`'i açtığında yanıtta `__session`/`__Host-csrf` dışında
      `Set-Cookie` yok. `__Host-csrf` yalnızca `/giris`, `/kayit` ve çıkışta yazılıyor
      (sahibi: engineer).
- [ ] Yeni çerez, `localStorage` anahtarı ya da 3. parti script ekleyen her PR, bu tabloyu
      günceller (sahibi: engineer, code-reviewer kontrol eder).

**Metin taslağı: çerez tablosu**

| Ad | Sağlayıcı | Amaç | Süre | Tür |
|----|-----------|------|------|-----|
| `__session` | Borsalıyorum | Giriş yaptığında oturumunu açık tutar | 14 gün ya da çıkışa kadar | Zorunlu |
| `__Host-csrf` | Borsalıyorum | Giriş/çıkış isteklerini sahte isteklere karşı korur | 2 saat | Zorunlu |
| `theme` (yerel depolama) | Borsalıyorum | Seçtiğin temayı bu cihazda hatırlar; sunucuya gönderilmez | Sen silene kadar | Tercih |
| Google / Firebase giriş penceresi | Google LLC | Yalnızca "Google ile devam et"e bastığında girişi tamamlar | Google'ın politikasına göre | Zorunlu (üçüncü taraf) |

| Name | Provider | Purpose | Duration | Type |
|------|----------|---------|----------|------|
| `__session` | Borsalıyorum | Keeps you signed in | 14 days or until you sign out | Strictly necessary |
| `__Host-csrf` | Borsalıyorum | Protects sign-in and sign-out requests against forged requests | 2 hours | Strictly necessary |
| `theme` (local storage) | Borsalıyorum | Remembers your theme on this device; never sent to our servers | Until you clear it | Preference |
| Google / Firebase sign-in window | Google LLC | Completes sign-in only when you choose "Continue with Google" | Per Google's policy | Strictly necessary (third party) |

---

## Hukuki değerlendirme 2: Aydınlatma linki ve "okudum" kutusu

**Olgular:** `/kayit`'ta form altında küçük bir not ve aydınlatma linki var. `/giris`'te yok.
Onboarding'de "Aydınlatma Metni'ni okudum" kutusu zorunlu. Firebase hesabı (e-posta, şifre
özeti, Google kimliği) onboarding'den **önce**, kayıt/giriş butonuna basıldığında oluşuyor.

**Uygulanan mevzuat:**
- KVKK md.10: aydınlatma, veri **elde edilirken** yapılır. (Doğrulandı: **hayır**, mevzuat.gov.tr
  açılamadı. Bilinen metin bu yönde.)
- Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ
  md.5/1: işleme açık rızaya dayanıyorsa aydınlatma ve açık rıza ayrı ayrı yapılır.
  (Doğrulandı: **kısmen**. Bent harfi kaynaklarda (f) ya da (t) olarak farklı geçiyor.)
- KVK Kurulu ilke kararı, 18.02.2026 tarih ve 2026/347 sayı (RG 24.03.2026, sayı 33203):
  aydınlatma metni ile açık rıza metni ayrı başlıkla ve ayrı beyanla sunulur. "Okudum ve kabul
  ediyorum", "okudum ve onaylıyorum" gibi ifadeler hata sayılır. Açık rıza dışındaki hukuki
  sebeplerde yalnızca okunup anlaşıldığına dair geri bildirim alınır.
  (Doğrulandı: **kısmen**. Karar bilgisi birden fazla ikincil kaynakta aynı. Resmî Gazete metni
  açılamadı.)
- Kurul'un 2019 değerlendirmesi: aydınlatma onaya bağlı değildir. Kullanıcının onayı aydınlatmanın
  şartı değildir. (Doğrulandı: **kısmen**, ikincil kaynak.)

**Karar:**
1. **Aydınlatma anı kayıt/giriş ekranıdır, onboarding değildir.** Veri Firebase'e o anda gidiyor.
   Link, butonun hemen altında ve buton görünürken okunabilir olmalı. Footer'a gömülmemeli.
   **`/giris`'e de aynı not eklenmeli**, çünkü Google ile ilk girişte hesap orada oluşuyor.
2. **Kutu hukuken zorunlu değil, ama izinli.** Üyelik verisi açık rızaya değil sözleşmeye (md.5/2-c),
   güvenlik logu kanuni yükümlülüğe (md.5/2-ç, 5651) dayanıyor. Bu yüzden rıza kutusu
   **olmamalı**. İlke kararı "okunup anlaşıldığına dair geri bildirim" almayı uygun görüyor.
   Mevcut kutu bu çerçeveye uyuyor ve `noticeVersion` ile güçlü bir ispat sağlıyor. **Kutu
   kalsın**, ama metin "okudum ve anladım" olsun. "Kabul ediyorum" ve "onaylıyorum" asla
   kullanılmasın.
3. Kutu işaretlenmezse kayıt tamamlanmıyor. Bu kabul edilebilir: aydınlatma yine de verilmiş
   oluyor, kutu yalnızca ispat. Ancak hata metni "rıza" ya da "kabul" demesin. Mevcut metin uygun.
4. **Link 404 veriyor.** `/yasal/kvkk` yayında değilken aydınlatma yapılmamış sayılır. **S5,
   aydınlatma sayfası canlıya çıkmadan prod'a açılmamalı.**
5. **Kullanım Koşulları kabulü eksik.** Bu KVKK değil, sözleşme hukuku konusu. Üyelik sözleşmesi
   genel işlem koşuludur. Karşı tarafa içeriği öğrenme imkânı verilmeli ve kabul alınmalı (TBK
   md.20-25, genel işlem koşulları; doğrulanmadı). Aydınlatma kutusuyla **birleştirilmemeli**.
   Ayrı ve zorunlu bir kutu olmalı, kabul edilen sürüm de kaydedilmeli.

**Riskler:**
- [YÜKSEK] `/yasal/kvkk` 404 iken kayıt açılırsa aydınlatma yapılmamış olur. Olası yaptırım:
  KVKK md.18/1-a idari para cezası (yukarıdaki aralık, doğrulanmadı) ve şikâyet üzerine Kurul
  incelemesi.
- [ORTA] `/giris` üzerinden Google ile ilk girişte veri, aydınlatma gösterilmeden Firebase'e
  gidiyor. Olası yaptırım: aynı.
- [ORTA] Kullanım Koşulları kabul edilmeden üyelik açılırsa, içerik kaldırma, hesap askıya alma
  ve sorumluluk sınırlaması gibi maddeler kullanıcıya karşı ileri sürülemeyebilir. Bu bir
  sözleşme riski, idari para cezası riski değil.
- [DÜŞÜK] "Okudum" ifadesinin "kabul" gibi anlaşılması. Önerilen metinle ortadan kalkar.

**Ürün gereksinimleri:**
- [ ] `/yasal/kvkk` sayfası (tr + `/en/...`) yayında ve `PRIVACY_NOTICE_VERSION` ile aynı sürümü
      gösteriyor. Bu olmadan S5 prod'a açılmaz (sahibi: engineer + legal/ops).
- [ ] `/kayit` ve `/giris`: aydınlatma notu, submit ve Google butonlarının **hemen altında**,
      footer'dan ayrı. Mobilde ilk ekranda görünür (sahibi: designer + engineer).
- [ ] Onboarding notice etiketi: "okudum ve anladım" (aşağıdaki metin). Test: tr ve en
      metinlerinde "kabul", "onay", "accept", "agree", "consent" kelimeleri yok
      (sahibi: engineer).
- [ ] Ayrı, zorunlu "Kullanım Koşulları'nı kabul ediyorum" kutusu. Yeni alanlar:
      `User.termsVersion` (VarChar 20) ve `User.termsAcceptedAt`, ayrıca
      `TERMS_VERSION` sabiti `legal-versions.ts`'te. `/yasal/kullanim-kosullari` sayfası yayında
      olmalı (sahibi: architect + engineer).
- [ ] Metin değişince sürüm artar. Eski sürümü okumuş kullanıcıya, önemli bir değişiklikte
      bildirim gösterilir (M2+, sahibi: engineer).

**Metin taslakları (i18n anahtarlarıyla):**

`auth.signup.privacyNote` / `auth.login.privacyNote` (yeni anahtar)
- tr: `Hesabını oluşturmak ve seni tanımak için e-posta adresini ve Google ile girersen Google hesabındaki adını işliyoruz. Ayrıntılar <link>Aydınlatma Metni</link>'nde.`
- en: `To create your account and recognise you, we process your email address and, if you use Google, the name on your Google account. Details are in the <link>Privacy Notice</link>.`

(Girişte kısa hali de kullanılabilir.
tr: `Kişisel verilerini nasıl işlediğimizi <link>Aydınlatma Metni</link>'nde anlatıyoruz.`
en: `We explain how we process your personal data in the <link>Privacy Notice</link>.`)

`auth.onboarding.notice.label` / `.required`
- tr: `<link>Aydınlatma Metni</link>'ni okudum ve anladım.` / `Devam etmek için Aydınlatma Metni'ni okuduğunu belirtmelisin.`
- en: `I have read and understood the <link>Privacy Notice</link>.` / `To continue, confirm that you have read the Privacy Notice.`

`auth.onboarding.terms.label` / `.required` (yeni)
- tr: `<link>Kullanım Koşulları</link>'nı kabul ediyorum.` / `Devam etmek için Kullanım Koşulları'nı kabul etmelisin.`
- en: `I accept the <link>Terms of Use</link>.` / `To continue, accept the Terms of Use.`

Sıra (yukarıdan aşağıya): 18+ → Kullanım Koşulları → Aydınlatma (okudum ve anladım) →
Pazarlama (isteğe bağlı). Aydınlatma ile pazarlama arasında boşluk ya da ayraç olmalı.

---

## Hukuki değerlendirme 3: 18+ yaş beyanı

**Olgular:** Zorunlu kutu: "18 yaşından büyüğüm." Doğum tarihi toplanmıyor (`birthday` kolonu
imha ediliyor). Kimlik doğrulaması yok.

**Uygulanan mevzuat:** TMK md.11 (erginlik 18) ve sınırlı ehliyetsizlerin borç altına girmesi için
yasal temsilci izni (TMK md.16, doğrulanmadı). KVKK'da çocuklar için ayrı bir yaş sınırı yok
(doğrulanmadı). Sosyal ağlar için yasal bir yaş doğrulama zorunluluğu bulunamadı
(doğrulanmadı; 5651'de bu konuda bir değişiklik gündemde olabilir, avukata sorulmalı).

**Karar:**
- Yaş sınırı bir ürün kararı ve yerinde: yatırım içeriği, sözleşme ehliyeti ve küçüklerden
  pazarlama izni alma riskini azaltıyor. Beyan yeterli. Kimlik ya da doğum tarihi istemek veri
  minimizasyonuna aykırı olur.
- **Metin hatası:** "18 yaşından büyüğüm" tam 18 yaşındakini dışarıda bırakıyor. Doğrusu
  "18 yaşında ya da daha büyüğüm."
- 18 yaşından küçük olduğu öğrenilen hesap için bir süreç gerekir: şikâyet nedeni "Bu kullanıcı
  18 yaşından küçük" → moderasyon → hesabın kapatılması ve verinin silinmesi.

**Riskler:**
- [DÜŞÜK] Küçük yaştaki kullanıcının yanlış beyanla üye olması. Beyan ve kapatma süreci,
  makul özen için yeterli görünüyor.
- [DÜŞÜK] Metnin 18 yaşındakileri hariç tutması.

**Ürün gereksinimleri:**
- [ ] Etiket metni değişir (aşağıda) (sahibi: engineer).
- [ ] Şikâyet nedenlerine "18 yaşından küçük kullanıcı" eklenir (sahibi: engineer, moderasyon dilimi).
- [ ] Kullanım Koşulları'nda yaş şartı yazılı (sahibi: legal).

**Metin taslağı:** `auth.onboarding.age.label` / `.required`
- tr: `18 yaşında ya da daha büyüğüm.` / `Borsalıyorum'u kullanmak için 18 yaşında ya da daha büyük olmalısın.`
- en: `I am 18 or older.` / `You must be 18 or older to use Borsalıyorum.`

---

## Hukuki değerlendirme 4: Pazarlama izni (ayrı, işaretsiz, İYS)

**Olgular:** Ayrı, isteğe bağlı, varsayılanı işaretsiz kutu. Verilirse `ConsentEvent` yazılıyor
(metin sürümüyle). Hint, iznin geri alınabileceğini ve üyeliği etkilemediğini söylüyor. Ayarlarda
geri alma ekranı, İYS entegrasyonu ve ret linki henüz yok. Şu an pazarlama e-postası
gönderilmiyor.

**Uygulanan mevzuat:**
- 6563 sayılı Kanun md.6 ve Ticari İletişim ve Ticari Elektronik İletiler Hakkında Yönetmelik:
  önceden onay, ret hakkı, İYS. (Doğrulandı: **hayır**, birincil metin açılamadı.)
- İYS dışında alınan onaylar 3 iş günü içinde İYS'ye kaydedilir. Kaydedilmeyen onay geçersiz
  sayılır. Ret beyanları da 3 iş günü içinde işlenir. (Doğrulandı: **kısmen**, birden fazla
  ikincil kaynak aynı şeyi söylüyor.)
- Onayda alıcının olumlu irade beyanı ve elektronik iletişim adresi bulunur.
  (Doğrulandı: **hayır**.)
- KVKK: pazarlama amaçlı işleme için açık rıza. 2026/347 ilke kararına göre rıza metni,
  aydınlatmadan ayrı başlıkla ve ayrı beyanla sunulur. (Doğrulandı: **kısmen**.)
- 2026 cezası: onaysız ticari ileti için 2.859 TL – 14.309 TL (Ticaret Bakanlığı tebliği,
  RG 25.12.2025/33118). Bilinen uygulamada ceza ileti başına hesaplanır. (Tutar doğrulandı:
  **kısmen**, ikincil kaynak. "İleti başına" kısmı doğrulanmadı.)

**Karar:**
- Tasarım doğru: ayrı, işaretsiz, üyeliğe bağlı değil. Hint metni de doğru.
- Metin, göndericiyi ve kanalı net söylemeli. "Duyuru" kelimesi belirsiz, çünkü hizmet duyurusu
  işlemsel de olabilir. Ne gönderileceği açıkça yazılmalı.
- **İYS'nin 3 iş günü kuralı nedeniyle**, İYS entegrasyonu olmadan toplanan onaylar sonra
  kullanılamayabilir. İki seçenek var:
  - (a) Kutu, İYS'ye yükleme (elle ya da API ile, 3 iş günü içinde) hazır olunca gösterilir.
    **Önerilen bu.** Kod hazır kalır, kutu feature flag ile kapalı tutulur.
  - (b) Kutu şimdi gösterilir ve yükleme elle yapılır. Bunun için operasyonel bir süreç gerekir.
- `ConsentEvent` onay verilen **e-posta adresini** tutmuyor. Kullanıcı sonra e-postasını
  değiştirirse eski onayın hangi adrese verildiği ispatlanamaz. İYS de adres bazlı çalışıyor.
- Geri alma, verme kadar kolay olmalı: ayarlarda tek tık ve her e-postada ret linki. Bunlar
  olmadan **hiçbir pazarlama e-postası gönderilmez**.

**Riskler:**
- [ORTA] İYS'ye yüklenmemiş onaylarla gönderim yapılması. Olası yaptırım: 6563 idari para cezası
  ve KVKK şikâyeti.
- [ORTA] Ayarlarda geri alma ve ret linki olmadan gönderim yapılması. Olası yaptırım: ret
  yükümlülüğüne aykırılık cezası (ikincil kaynağa göre üst sınır 42.930 TL, doğrulanmadı).
- [DÜŞÜK] Adres bilgisi kaydedilmediği için onayın ispatlanamaması.

**Ürün gereksinimleri:**
- [ ] Kutu, `MARKETING_CONSENT_ENABLED` flag'i ile kapalı tutulur. İYS yüklemesi ve ret akışı
      hazır olunca açılır (sahibi: engineer + ops).
- [ ] `ConsentEvent`'e `address` (onay verilen e-posta) ve gerekirse `iysSyncedAt` alanları
      eklenir. İYS kaynağı "web" olarak işaretlenir (sahibi: architect).
- [ ] E-posta değişince `marketing_email` için `granted=false` yazılır ve yeni adres için onay
      tekrar istenir (sahibi: engineer).
- [ ] Ayarlar > Bildirimler ekranında pazarlama izni tek tıkla kapatılır ve `granted=false,
      source=settings` yazılır (sahibi: engineer).
- [ ] Gönderim servisi, gönderimden hemen önce son `ConsentEvent` ve İYS durumunu kontrol eder.
      Test: izni geri alınmış kullanıcıya gönderim yapılmıyor (sahibi: engineer).

**Metin taslağı:** `auth.onboarding.marketing.label` / `.hint`
- tr: `Borsalıyorum'un yenilik, kampanya ve bültenlerini e-posta ile almak istiyorum. (İsteğe bağlı)` /
  `İznini istediğin an ayarlardan ya da e-postadaki bağlantıdan geri alabilirsin. İzin vermemen üyeliğini etkilemez.`
- en: `I'd like to receive Borsalıyorum news, offers and newsletters by email. (Optional)` /
  `You can withdraw anytime in settings or via the link in any email. Not giving permission doesn't affect your membership.`

(Metin değişince `MARKETING_CONSENT_TEXT_VERSION` artırılmalı.)

---

## Hukuki değerlendirme 5: Google ile giriş ve yurt dışına aktarım (KVKK md.9)

**Olgular:** Google ile girişte Google'dan ad, e-posta, e-posta doğrulama durumu ve Google UID
alınıyor. Profil fotoğrafı token'da gelebilir ama kullanılmıyor. **Asıl aktarım Google ile girişe
özgü değil.** Tüm kullanıcıların e-postası ve şifre özeti Firebase Authentication'da (Google
LLC, ABD) tutuluyor. Doğrulama e-postasını da Firebase gönderiyor. Ayrıca Vercel (ABD şirketi,
`fra1`) ve Neon (muhtemelen AWS `eu-central-1`) var.

**Uygulanan mevzuat:** KVKK md.9, 7499 sayılı Kanunla değişik hali (2024) ve Kişisel Verilerin
Yurt Dışına Aktarılmasına İlişkin Usul ve Esaslar Hakkında Yönetmelik (2024). Yeterlilik kararı
yoksa uygun güvenceler (ör. standart sözleşme) kullanılır. Standart sözleşme imzadan itibaren
**5 iş günü** içinde Kurum'a bildirilir. Bildirim modülü Kurul'un 17.10.2024 tarih ve 2024/1793
sayılı kararıyla açıldı. Açık rıza yalnızca arızi aktarımlar için kullanılabilir, sürekli hizmet
için kullanılamaz.
(Doğrulandı: **kısmen**. 5 iş günü süresi kvkk.gov.tr duyurusuna atıfla arama sonucunda görüldü.
Kanun ve yönetmelik metni açılamadı.)

**Karar:**
- **Evet, aydınlatmada yer almalı**, ama "Google ile giriş" başlığı altında değil. Ayrı bir
  "Yurt dışına aktarım" bölümünde, Firebase/Google, Vercel ve Neon/AWS için yazılmalı: alıcı,
  ülke, veri kategorisi, amaç ve dayanak (standart sözleşme).
- Google ile girişe özgü olarak aydınlatmaya **toplama yöntemi** eklenir: "Google ile girersen,
  Google'dan adını ve e-posta adresini alırız." Google'ın kendi hesabın için yaptığı işleme,
  Google'ın kendi gizlilik politikasına tabidir.
- Aktarım için **açık rıza kutusu eklenmemeli**. 2024 değişikliğinden sonra sürekli aktarım için
  rıza uygun dayanak değil. Rıza almak, yanlış dayanak izlenimi yaratır.
- Firebase/Google için standart sözleşme imzalanıp 5 iş günü içinde bildirildi mi? Bu
  ADR-0001'deki **L1** sorusu ve hâlâ açık. Bu, S5'ten bağımsız ama kayıt akışı canlıya
  çıkmadan çözülmeli.

**Riskler:**
- [YÜKSEK] Firebase (ABD) için md.9 güvencesi ve bildirimi yoksa, her kayıt hukuka aykırı
  aktarım olur. Olası yaptırım: KVKK md.18 idari para cezası. Standart sözleşme bildirmeme için
  ikincil kaynakta 50.000 – 1.000.000 TL (yeniden değerlemeyle değişir) yazıyor; doğrulanmadı.
- [ORTA] Aydınlatmada yurt dışı alıcıların eksik listelenmesi.

**Ürün gereksinimleri:**
- [ ] Aydınlatma metninde "Yurt dışına aktarım" tablosu: Google LLC (Firebase Auth, e-posta
      gönderimi), Vercel Inc., Neon/AWS. Ülke, veri, amaç, dayanak sütunlarıyla (sahibi: legal/ops).
- [ ] Alt işleyen listesi `docs/legal/alt-isleyenler.md` olarak tutulur. Yeni SDK ekleyen her PR
      bu listeyi günceller (sahibi: engineer + ops).
- [ ] Google'dan alınan `picture` claim'i saklanmıyor. Test ile korunur (sahibi: engineer).

**Metin taslağı (aydınlatma metni, ilgili bölümler):**

tr:
> **Hangi verileri, nasıl topluyoruz?** Kayıt olurken e-posta adresini ve şifreni (şifren
> bizde düz metin olarak tutulmaz) alırız. "Google ile devam et"i seçersen Google'dan adını,
> e-posta adresini ve Google hesap kimliğini alırız. Ardından seçtiğin kullanıcı adını, görünen
> adını ve 18 yaşında ya da daha büyük olduğuna dair beyanını kaydederiz. Giriş yaptığında IP
> adresini ve zamanı güvenlik ve yasal kayıt amacıyla tutarız.
>
> **Neden işliyoruz?** Üyeliğini oluşturmak ve hesabını yönetmek (sözleşmenin kurulması ve
> ifası), hesabını ve platformu güvende tutmak (meşru menfaat), 5651 sayılı Kanun kapsamındaki
> kayıt yükümlülüğünü yerine getirmek (kanuni yükümlülük). Pazarlama e-postasını yalnızca ayrıca
> izin verirsen göndeririz.
>
> **Yurt dışına aktarım.** Hesap ve kimlik doğrulama hizmetini Google LLC'nin Firebase
> Authentication servisi (ABD) sağlar; doğrulama e-postaları da bu servisle gönderilir.
> Uygulamamız Vercel Inc. altyapısında, veritabanımız [Neon / AWS, bölge] üzerinde çalışır. Bu
> aktarımlar KVKK md.9 kapsamında [standart sözleşme] ile yapılır. *(Köşeli parantezler L1
> sorusu yanıtlanınca doldurulacak.)*
>
> **Çerezler.** Yalnızca giriş yapmış kalman ve güvenliğin için zorunlu çerezler kullanıyoruz.
> Ayrıntılar: Çerez Politikası.

en:
> **What we collect and how.** When you sign up we collect your email address and password
> (we never store your password in plain text). If you choose "Continue with Google", we receive
> your name, email address and Google account ID from Google. We then record the username and
> display name you choose and your confirmation that you are 18 or older. When you sign in we log
> your IP address and the time, for security and legal record-keeping.
>
> **Why.** To create and manage your account (performance of a contract), to keep your account
> and the platform secure (legitimate interest), and to meet our record-keeping duty under Law
> No. 5651 (legal obligation). We only send marketing emails if you give separate permission.
>
> **Transfers abroad.** Sign-in and account authentication are provided by Google LLC's Firebase
> Authentication (USA), which also sends verification emails. Our application runs on Vercel
> Inc. infrastructure and our database on [Neon / AWS, region]. These transfers rely on [standard
> contractual clauses] under Article 9 of the KVKK.
>
> **Cookies.** We only use strictly necessary cookies that keep you signed in and secure. See
> the Cookie Policy.

---

## Hukuki değerlendirme 6: E-posta doğrulama e-postası

**Olgular:** Kayıttan hemen sonra ve "yeniden gönder" ile Firebase şablonuyla gönderiliyor.
Dil, arayüz diliyle aynı (`auth.languageCode`).

**Uygulanan mevzuat:** 6563 ticari elektronik ileti tanımı, mal veya hizmeti tanıtma ya da
pazarlama amacı taşıyan iletileri kapsar. Hesap doğrulama ileti bu amacı taşımaz, onay ve İYS
gerektirmez. (Doğrulandı: **hayır**, birincil metin açılamadı. Bilinen uygulama bu yönde.)

**Karar:** İşlemsel ileti, İYS gerekmez. **Koşul:** İçine tanıtım, kampanya, "uygulamamızı
indir" ya da bülten çağrısı eklenmemeli. Eklenirse ticari ileti sayılır.

**Riskler:** [DÜŞÜK] Şablona tanıtım cümlesi eklenmesi.

**Ürün gereksinimleri:**
- [ ] Firebase konsolundaki doğrulama ve şifre sıfırlama şablonları (tr + en) aşağıdaki metinle
      ayarlanır. Gönderen adı "Borsalıyorum" olur (sahibi: ops).
- [ ] Şablon değişikliği `legal-advisor` incelemesinden geçer (sahibi: ops).

**Metin taslağı (Firebase şablonu):**

tr
- Konu: `E-posta adresini doğrula`
- Gövde: `Merhaba, Borsalıyorum hesabını oluşturmak için e-posta adresini doğrula: %LINK% — Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; hesap oluşturulmaz ya da doğrulanmaz. Borsalıyorum`

en
- Subject: `Verify your email address`
- Body: `Hi, verify your email address to finish setting up your Borsalıyorum account: %LINK% — If you didn't request this, you can ignore this email; the address won't be verified. Borsalıyorum`

Not: Firebase hesabı e-posta doğrulansa da doğrulanmasa da oluşuyor. Bu yüzden "hesap
oluşturulmaz" yerine "adres doğrulanmaz" demek daha doğru olabilir. Yukarıdaki en metni bunu
kullanıyor; tr metni de buna göre seçilebilir:
`…bu e-postayı yok sayabilirsin; adres doğrulanmaz.`

---

## Hukuki değerlendirme 7: Hesap silme (KVKK md.11) henüz yok

**Olgular:** Self-servis "hesabımı sil" ve "verilerimi indir" yok. Onboarding'i bitirmeyen
kullanıcının Firebase hesabı süresiz kalıyor (`User` satırı yok).

**Uygulanan mevzuat:** KVKK md.7 (silme/yok etme) ve md.11 (ilgili kişinin hakları). md.13 ve
Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ: başvuru en geç **30 gün** içinde
ücretsiz sonuçlandırılır. Başvuru yazılı, KEP, güvenli e-imza, mobil imza, **veri sorumlusunda
kayıtlı e-posta adresinden** ya da bu amaçla yapılmış bir uygulama üzerinden yapılabilir.
(Doğrulandı: **kısmen**, ikincil kaynaklar ve KVKK belgelerine atıf.)

**Karar:**
- **Self-servis silme kanunen zorunlu değil.** Zorunlu olan, **ilk kullanıcıdan itibaren**
  çalışan bir başvuru kanalı ve 30 gün içinde silme. Kayıtlı e-posta adresinden gelen başvuru,
  Tebliğ'de geçerli yöntem.
- Yani S5 canlıya çıktığı gün şunlar hazır olmalı: (1) aydınlatmada başvuru adresi
  (ör. `kvkk@borsaliyorum.com`), (2) silme talebini 30 gün içinde uygulayan yazılı bir runbook
  (Firebase hesabı + `User` + içerik anonimleştirme, 5651 logları ve izin kanıtları yasal süre
  boyunca ayrı tutulur).
- Self-servis silme için öneri: **premium/ödeme açılmadan önce ve en geç genel lansmandan önce.**
  Kullanıcı sayısı arttıkça elle silme hem 30 gün süresini kaçırma riskini hem de hata riskini
  büyütüyor. App Store/Play Store'a mobil uygulama çıkarılırsa uygulama içi silme mağaza kuralı
  olarak da zorunlu hale gelir (KVKK değil, mağaza kuralı).
- **Onboarding'i yarım bırakanlar:** Firebase'de e-posta duruyor ama ürün hesabı yok. Bir saklama
  süresi belirlenmeli (öneri: 30 gün) ve periyodik imha ile silinmeli (Silme Yönetmeliği:
  periyodik imha en fazla 6 ayda bir; doğrulanmadı).

**Riskler:**
- [YÜKSEK] Başvuru kanalı ve runbook olmadan kayıt açmak. 30 günü kaçırmak, Kurul'a şikâyet ve
  idari para cezası riski doğurur.
- [ORTA] Yarım kalan Firebase hesaplarının süresiz saklanması. Bu, saklama ilkesine (md.4,
  "gerekli olan süre kadar") aykırı.
- [DÜŞÜK] Self-servis silmenin ilk sürümde olmaması (kanal varsa).

**Ürün gereksinimleri:**
- [ ] Aydınlatmada başvuru e-posta adresi ve posta adresi var (sahibi: legal/ops).
- [ ] `docs/runbooks/kvkk-basvuru.md`: talebi alma, kimliği doğrulama (kayıtlı e-postadan geldi
      mi), silme adımları, 30 gün takibi (sahibi: ops + engineer).
- [ ] Zamanlanmış iş: `User` satırı olmayan ve 30 günden eski Firebase hesapları silinir.
      Test: 31 günlük yetim hesap siliniyor, 29 günlük kalıyor (sahibi: engineer).
- [ ] Self-servis "Hesabımı sil" + "Verilerimi indir" yol haritasına alınır (hedef: premium ve
      genel lansmandan önce) (sahibi: architect).
- [ ] `ConsentEvent` ve 5651 logları için saklama süresi saklama/imha politikasına yazılır
      (sahibi: legal).

---

## Küçük UX/metin önerileri

`auth.onboarding.displayName.hint`
- tr: `Herkese açıktır; profilinde ve gönderilerinde görünür. Gerçek adını yazmak zorunda değilsin.`
- en: `Public: shown on your profile and posts. It doesn't have to be your real name.`

Gerekçe: Görünen ad Google adından otomatik doluyor. Kullanıcı bunun herkese açık olduğunu
bilmeli (veri minimizasyonu, alenileştirmenin bilinçli olması).

---

## Avukat onayı gerekli

1. Aydınlatma metninin tamamı, özellikle hukuki sebepler ve yurt dışına aktarım bölümü (md.9
   dayanağı, Firebase/Vercel/Neon için standart sözleşme ve 5 iş günü bildirimi, ADR L1).
2. Pazarlama kutusunun hem 6563 onayı hem KVKK açık rızası olarak tek kutuyla alınabileceği
   yorumu (2026/347 ilke kararı ışığında ayrı rıza metni gerekip gerekmediği).
3. Kullanım Koşulları kabul mekanizması (TBK genel işlem koşulları) ve koşulların içeriği.
4. Hesap silmede `ConsentEvent`, 5651 logları ve kullanıcı içeriği için saklama süreleri.
5. 18+ beyanının yeterliliği ve yaş doğrulamaya ilişkin gündemdeki 5651 değişikliklerinin
   durumu.

## Açık sorular

1. Firebase (Google) ile KVKK standart sözleşmesi imzalandı ve Kurum'a bildirildi mi? Vercel ve
   Neon için durum ne? (ADR-0001 L1)
2. İYS'ye kayıt (hizmet sağlayıcı kaydı) yapıldı mı? Yapılmadıysa pazarlama kutusu flag ile
   kapalı mı kalsın?
3. `/yasal/kvkk` ve `/yasal/kullanim-kosullari` hangi dilimde ve S5 ile aynı anda mı canlıya
   çıkacak?
4. KVKK başvuru adresi ve veri sorumlusu bilgileri (unvan, adres, MERSİS) ne olacak?
5. VERBIS kaydı ya da muafiyet durumu belirlendi mi?

## Kaynaklar (bu oturumda görülen, ikincil)

- [KVKK: Standart sözleşmelerde dikkat edilecek hususlar duyurusu](https://www.kvkk.gov.tr/Icerik/8170/Yurt-Disina-Kisisel-Veri-Aktariminda-Kullanilacak-Standart-Sozlesmelerde-Dikkat-Edilmesi-Gereken-Hususlara-Iliskin-Kamuoyu-Duyurusu)
- [Erdem & Erdem: Standart Sözleşme Bildirim Modülü](https://www.erdem-erdem.av.tr/bilgi-bankasi/standart-sozlesme-bildirim-modulu-hakkinda-kamuoyu-duyurusu)
- [Lexpera: Kurul'un 18.02.2026 tarihli ve 2026/347 sayılı kararı](https://www.lexpera.com.tr/mevzuat/kurul-kararlari/kisisel-verileri-koruma-kurulunun-18-02-2026-tarihli-ve-2026-347-sayili-karari-2026-347-1)
- [Alomaliye: açık rıza ve aydınlatma metni ayrı düzenlenmeli](https://www.alomaliye.com/2026/03/24/kvkkdan-yeni-ilke-karari-acik-riza-metni-ile-aydinlatma-metni-artik-ayri-duzenlenmeli/)
- [Cottgroup: aydınlatma ve açık rıza metinlerinin yönetimi](https://cottgroup.com/tr/mevzuat/item/kvkk-ilke-karari-aydinlatma-ve-acik-riza-metinlerinin-yonetimi)
- [Cottgroup: 2026 KVKK idari para cezaları](https://cottgroup.com/tr/mevzuat/item/yeniden-degerleme-oranina-gore-2026-yili-kvkk-idari-para-cezalari)
- [Hukuki Haber: 6563 kapsamında 2026 idari para cezaları tebliği](https://www.hukukihaber.net/6563-sayili-elektronik-ticaretin-duzenlenmesi-hakkinda-kanunun-12-nci-maddesine-gore-2026-yilinda-uygulanacak-olan-idari-para-cezalarina-iliskin-teblig)
- [Ticaret Bakanlığı: İleti Yönetim Sistemi](https://ticaret.gov.tr/ic-ticaret/ticari-elektronik-iletiler/ileti-yonetim-sistemi-iys)
- [Alomaliye: İYS 2020 değişiklikleri](https://www.alomaliye.com/2020/01/04/ticari-iletisim-ve-ticari-elektronik-iletiler/)
- [Lexpera: Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ](https://www.lexpera.com.tr/mevzuat/tebligler/veri-sorumlusuna-basvuru-usul-ve-esaslari-hakkinda-teblig)
- [NTV: KVKK çerez rehberi](https://www.ntv.com.tr/teknoloji/kvkk-cerezler-icin-rehber-hazirladi,BdjApRquJEmK4KG6JZ-IpQ)
