# Yasal metinler: yayın ve onay durumu

> Sayfalarda "taslak / avukat onayı bekliyor" gibi **dahili not gösterilmez**. Onay durumu
> yalnızca bu tabloda tutulur. Hukuki çıktılar bilgilendirme amaçlıdır; **yayına almadan önce
> Türkiye'de ruhsatlı bir avukatın (bilişim + KVKK + sermaye piyasası) onayı gerekir.**

## Tek kaynaklar

| Ne | Nerede |
|----|--------|
| Sürüm numaraları, yürürlük tarihi, sayfa adresleri | `src/lib/legal/versions.ts` |
| Sayfa metinleri (tr + en) | `messages/legal/tr.json`, `messages/legal/en.json` |
| Tam SPK uyarı metni (footer + `/yasal/yatirim-uyarisi`) | `messages/{tr,en}.json` → `legal.disclaimer.full` |
| Kayıt ekranı metinleri (aydınlatma notu, kutular) | `messages/{tr,en}.json` → `auth.*` |
| Başvuru / destek e-postası | `src/lib/support.ts` |
| Pazarlama izni kutusu | `MARKETING_CONSENT_ENABLED` (varsayılan kapalı, `src/lib/feature-flags.ts`) |

Metin değiştiğinde: ilgili sürümü `versions.ts`'te artır, aşağıdaki tabloyu güncelle. Kayıt
kanıtı (`User.noticeVersion`, `User.termsVersion`, `ConsentEvent.textVersion`) sürümü buradan
yazar.

## Sayfa ↔ onay durumu

| Sayfa | Adres (tr / en) | Sürüm | Kaynak taslak | Avukat onayı | Not |
|-------|-----------------|-------|---------------|--------------|-----|
| KVKK Aydınlatma Metni | `/yasal/kvkk` · `/en/yasal/kvkk` | 2026-10-v1 | `auth-metinleri.md` HD-1, 2, 5, 7; `references/kvkk.md` | Bekliyor | Yer tutucular dolmadan yayına alınamaz. Yurt dışı aktarım dayanağı (ADR-0001 L1) açık. Saklama süreleri (izin/kabul kayıtları "zamanaşımı süresince") avukata sorulmalı. |
| Çerez Politikası | `/yasal/cerez-politikasi` | 2026-10-v1 | `auth-metinleri.md` HD-1 | Bekliyor | Taslaktaki tabloya kodda bulunan iki depolama anahtarı eklendi: `bz:draft:*` (composer taslakları, "İşlevsel") ve `borsaliyorum:google-redirect` (sessionStorage, "Zorunlu"). Sınıflandırma legal-advisor tarafından teyit edilmeli. |
| Kullanım Koşulları | `/yasal/kullanim-kosullari` | 2026-10-v1 | `lansman-kontrol-listesi.md`, `composer-metinleri.md` HD-2, `references/sermaye-piyasasi.md`, `icerik-5651.md`, `tuketici-reklam-fikri.md` | Bekliyor | Taslak metin legal-advisor tarafından bu dilim için **yazılmadı**; engineer kontrol listesinden derledi. legal-advisor incelemesi + avukat onayı zorunlu (TBK genel işlem koşulları, lisans kapsamı, sorumluluk sınırı, yetkili mahkeme). |
| Yatırım Uyarısı | `/yasal/yatirim-uyarisi` | 2026-10-v1 | `references/sermaye-piyasasi.md` §1, `composer-metinleri.md` HD-1 | Bekliyor | Tam metin referanstaki SPK metniyle birebir. "Bu ne anlama geliyor?" bölümü engineer taslağı. |
| Topluluk Kuralları | `/yasal/topluluk-kurallari` | 2026-10-v1 | `lansman-kontrol-listesi.md`, `icerik-5651.md` | Bekliyor | Engineer taslağı; legal-advisor + ui-ux-designer (UX metni) incelemesi gerekli. "Şikayet et" özelliği henüz yok; metin e-posta ile bildirime yönlendiriyor. |
| Kayıt ekranı metinleri | `/giris`, `/kayit`, `/hos-geldin` | — | `auth-metinleri.md` HD-2, 3, 4 | Bekliyor | Pazarlama kutusu metni değişti → `MARKETING_CONSENT_TEXT_VERSION` = 2026-10-v2. Kutu flag ile kapalı. |

Durum değerleri: **Bekliyor** · **İncelemede** (avukata gönderildi, tarih) · **Onaylandı** (tarih,
onaylayan) · **Değişiklik istendi**.

## Doldurulması gereken yer tutucular

Sayfalarda `[Şirket unvanı]` gibi işaretli (`<mark data-legal-placeholder>`) görünür. Değerler
`messages/legal/{tr,en}.json` → `placeholders` altında; metinlerde `[[ph:<anahtar>]]`.
Gerçek değer gelince ilgili `[[ph:…]]` işaretleri düz metinle değiştirilir ve anahtar
`PLACEHOLDER_KEYS`'ten (`src/features/legal/content.ts`) silinir.

| Anahtar | Ne | Kullanıldığı yer |
|---------|----|------------------|
| `company` | Veri sorumlusu / şirket unvanı | KVKK (veri sorumlusu), Koşullar (taraflar, iletişim) |
| `address` | Şirketin açık adresi (yazılı başvuru adresi) | KVKK (veri sorumlusu, başvuru), Koşullar |
| `mersis` | MERSİS numarası | KVKK, Koşullar |
| `kep` | KEP adresi | KVKK (veri sorumlusu, başvuru), Koşullar |
| `dbRegion` | Neon veritabanının ülke/bölgesi (ör. Almanya, AWS eu-central-1) | KVKK (yurt dışı aktarım) |
| `transferSafeguard` | KVKK md.9 dayanağı (ör. standart sözleşme + Kurul'a bildirim tarihi), Google/Vercel/Neon için | KVKK (yurt dışı aktarım) |
| `court` | Yetkili mahkeme ve icra daireleri (ör. İstanbul (Çağlayan)) | Koşullar (uyuşmazlıklar) |

Ayrıca karar bekleyenler: VERBIS kaydı/muafiyeti, başvuru adresinin `destek@` mi yoksa ayrı
bir `kvkk@` adresi mi olacağı (`src/lib/support.ts`), İYS kaydı (pazarlama kutusunu açmadan
önce).
