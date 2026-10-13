# KVKK — 6698 sayılı Kişisel Verilerin Korunması Kanunu

Son bilinen durum; sayısal eşik ve süreleri `kvkk.gov.tr` ve `mevzuat.gov.tr`'den doğrula.

## Borsalıyorum'un işlediği veriler (envanter başlangıcı)

| Kategori | Örnek | Hukuki sebep (md.5/2) | Not |
|----------|-------|----------------------|-----|
| Kimlik/iletişim | ad-soyad (displayName), e-posta, kullanıcı adı | Sözleşmenin ifası (üyelik) | E-posta herkese açık değil |
| Profil | fotoğraf, bio, konum, web sitesi, doğum tarihi | Sözleşme / kullanıcının kendisi alenileştirmesi | Doğum tarihi gerçekten gerekli mi? Yaş beyanı yeterli olabilir |
| Kullanıcı içeriği | gönderi, yorum, beğeni, takip | Sözleşme; alenileştirme | Silme talebinde yayından kaldırma |
| İşlem güvenliği | IP, port, cihaz, oturum logları | Kanuni yükümlülük (5651) + meşru menfaat | Saklama süresi 5651'e göre |
| Pazarlama | bülten e-postası | **Açık rıza** + İYS | Ayrı, isteğe bağlı |
| Analitik/reklam | çerez, cihaz kimliği | **Açık rıza** | Bkz. cerez-ve-ticari-ileti.md |
| Ödeme (premium) | fatura bilgisi | Sözleşme + kanuni yükümlülük (VUK) | Kart verisi tutulmaz, ödeme kuruluşunda |

**Özel nitelikli veri** (md.6: sağlık, din, siyasi görüş, biyometrik…) toplanmaz. Kullanıcı
içeriğinde kendiliğinden geçebilir; bu veriler profillemede kullanılmaz.

## Yükümlülükler → ürün gereksinimi

1. **Aydınlatma (md.10)**: veri sorumlusunun kimliği, amaçlar, aktarılan taraflar ve amaçları,
   toplama yöntemi ve hukuki sebep, md.11 hakları. Kayıt ekranında link, footer'da kalıcı link.
   Aydınlatma ile açık rıza **ayrı** metinler; aydınlatma "okudum, onaylıyorum" checkbox'ı
   ile rızaya dönüştürülmez.
2. **Açık rıza (md.3, md.5)**: belirli konuya ilişkin, bilgilendirmeye dayalı, özgür iradeyle.
   Hizmet şartına bağlanamaz (pazarlama rızası vermeyen üye olabilmeli). Geri alma, verme
   kadar kolay olmalı (ayarlar sayfası).
3. **Yurt dışına aktarım (md.9, 2024 değişikliği)**: Firebase/Google Cloud, Vercel, analitik,
   e-posta sağlayıcı gibi yurt dışı servisler aktarım sayılır. Yeterlilik kararı yoksa
   uygun güvencelerden biri (ör. Kurul'un yayımladığı **standart sözleşme**; imzadan sonra
   belirli süre içinde — bilinen: 5 iş günü — Kurul'a bildirim). Arızi aktarım istisnası
   sürekli hizmet için kullanılmaz. Mimari kararında: mümkünse veri Türkiye'de / AB'de
   tutulsun ve her yurt dışı alt işleyen listelensin. **Avukat onayı gerekli.**
4. **VERBIS**: kayıt yükümlülüğü ve muafiyet eşikleri (çalışan sayısı / yıllık mali bilanço)
   değişebilir — güncel eşiği doğrula.
5. **Veri güvenliği (md.12)**: erişim yetkilendirme, şifreleme (aktarımda TLS, hassas alanlarda
   at-rest), loglama, alt işleyen sözleşmeleri.
6. **İhlal bildirimi**: Kurul'a öğrenildikten itibaren 72 saat içinde; ilgili kişilere makul
   en kısa sürede. Ürün tarafında: olay müdahale runbook'u, ihlal tespit logları.
7. **İlgili kişi başvuruları (md.11, md.13)**: en geç 30 gün içinde ücretsiz yanıt. Ürün
   tarafında: "verilerimi indir" (JSON export) ve "hesabımı sil" self-servis.
8. **Silme/yok etme**: Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi
   Hakkında Yönetmelik — saklama/imha politikası, periyodik imha (bilinen: en fazla 6 ayda bir).
   Hesap silmede: profil + içerik silinir/anonimleşir; 5651 logları yasal süre boyunca ayrı
   tutulur, sonra imha.

## Tasarım ilkeleri (privacy by design)

- Veri minimizasyonu: alanı ancak somut amaç varsa ekle. Şemaya her yeni kişisel veri alanı
  eklenirken envanter tablosu güncellenir.
- E-posta, firebaseUid, IP asla public API yanıtında.
- Log'larda e-posta/IP maskelenir.
- Yeni 3. parti SDK = yeni alt işleyen = aydınlatma metni + (yurt dışıysa) md.9 analizi.
