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

Metin değiştiğinde: ilgili sürümü ve yürürlük tarihini `versions.ts`'te artır, aşağıdaki
tabloyu güncelle. Kayıt kanıtı (`User.noticeVersion`, `User.termsVersion`,
`User.legalBundleVersion` + `communityRulesVersion` + `disclaimerVersion`,
`ConsentEvent.textVersion`) sürümü buradan yazar.

**Yeniden kabul:** Koşullar, Topluluk Kuralları ya da Yatırım Uyarısı'nda **aleyhe önemli** bir
değişiklik yapılırsa `LEGAL_BUNDLE_VERSION` da artırılır. Girişli her kullanıcı
`/yasal/yeni-surum`'da yeni sürümü kabul edene kadar yazamaz (okuma serbest). Koşullar gereği
bu değişiklik yürürlükten **en az 30 gün önce** e-postayla ve Platformda duyurulmalıdır (e-posta
altyapısı henüz yok: takip işi). Lehe ya da kanundan doğan değişiklikte yalnızca belge sürümü
artar.

**Yayın kapısı:** production build'i (`VERCEL_ENV=production`) metinlerde `[[ph:…]]` kalmışsa
durur (`src/lib/legal/publish-gate.ts`; `SKIP_ENV_VALIDATION` ile atlanamaz). Aşağıdaki yer
tutucular doldurulmadan production'a yayın yapılamaz.

## Sayfa ↔ onay durumu

| Sayfa | Adres (tr / en) | Sürüm | Kaynak taslak | Avukat onayı | Not |
|-------|-----------------|-------|---------------|--------------|-----|
| KVKK Aydınlatma Metni | `/yasal/kvkk` · `/en/yasal/kvkk` | 2026-10-v2 | `auth-metinleri.md` HD-1, 2, 5, 7; `references/kvkk.md`; legal review 2026-10-11 | Bekliyor | Yer tutucular dolmadan yayına alınamaz (yayın kapısı). v2: yurt dışı aktarıma Vercel uç sunucuları + uygulama bölgesi (`appRegion`) ve GitHub Actions eklendi; "alenileştirme (5/2-d)" kaldırıldı (yalnızca 5/2-c); yazılı başvuruda ıslak imza + kimlik numarası; pazarlama izni kayıtları için saklama satırı (**izin sona erdikten 3 yıl — avukat teyidi bekliyor**); yetim hesap satırına 15 günlük son giriş payı. Kabul/okuma kayıtları "zamanaşımı süresince" avukata sorulmalı. |
| Çerez Politikası | `/yasal/cerez-politikasi` | 2026-10-v2 | `auth-metinleri.md` HD-1; legal review 2026-10-11 | Bekliyor | v2: `theme` ve `bz:draft:*` → "Zorunlu (istediğin işlev için)" + açıklama cümlesi; diğerleri "Zorunlu" (legal-advisor önerisi). Onay penceresi yok (zorunlu çerez/depolama). |
| Kullanım Koşulları | `/yasal/kullanim-kosullari` | 2026-10-v2 | `lansman-kontrol-listesi.md`, `composer-metinleri.md` HD-2, `references/sermaye-piyasasi.md`, `icerik-5651.md`, `tuketici-reklam-fikri.md`; legal review 2026-10-11 | Bekliyor | v2 (legal-advisor metinleri): uyuşmazlık (kanunen yetkili mahkeme + tüketici hakem heyeti/mahkemesi; `court` yalnızca tacir cümlesinde), değişiklikler (aleyhe değişiklik 30 gün önce, kabul edilmezse ücretsiz fesih, kabul edene kadar yazma kapalı), 5651 bildirim yolu ve **24 saat inceleme taahhüdü (kanuni süre değil)**, menfaat karşılığı yatırım aracı tanıtımı etiketlenmez/kaldırılır, içsel bilgiyle işlem, "kendi kusurumuzdan doğan zararlar saklıdır". Avukat onayı zorunlu (TBK genel işlem koşulları, sorumluluk, yetki). |
| Yatırım Uyarısı | `/yasal/yatirim-uyarisi` | 2026-10-v1 | `references/sermaye-piyasasi.md` §1, `composer-metinleri.md` HD-1 | Bekliyor | Değişmedi. Tam metin referanstaki SPK metniyle birebir. "Bu ne anlama geliyor?" bölümü engineer taslağı. Yeniden kabul paketinde. |
| Topluluk Kuralları | `/yasal/topluluk-kurallari` | 2026-10-v2 | `lansman-kontrol-listesi.md`, `icerik-5651.md`; legal review 2026-10-11 | Bekliyor | v2: içsel bilgiyle işlem yasağı; bildirimde istenen bilgiler ve 24 saat taahhüdü. ui-ux-designer (UX metni) incelemesi gerekli. "Şikayet et" özelliği henüz yok; metin e-posta ile bildirime yönlendiriyor. Yeniden kabul paketinde. |
| Kayıt ekranı metinleri | `/giris`, `/kayit`, `/hos-geldin` | — | `auth-metinleri.md` HD-2, 3, 4 | Bekliyor | Pazarlama kutusu metni değişti → `MARKETING_CONSENT_TEXT_VERSION` = 2026-10-v2. Kutu flag ile kapalı. İzin yalnızca e-postası doğrulanmış kullanıcıda yazılır (**takip:** flag açılınca doğrulanmamış kullanıcıya izin, e-posta doğrulandığında yeniden sorulmalı). |
| Yeni sürüm kabul ekranı | `/yasal/yeni-surum` | paket 2026-10-v1 | legal review 2026-10-11 (madde 8) | Bekliyor | Yeni ekran (`messages/{tr,en}.json` → `legalUpdate.*`). ui-ux-designer + legal-advisor metin incelemesi gerekli. |

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
| `appRegion` | Vercel fonksiyon bölgesi (ADR-0001: `fra1` → Almanya, Frankfurt). Depodaki yapılandırmadan doğrulanamadı (`vercel.json`/`preferredRegion` yok); Vercel proje ayarından teyit edilip yazılmalı | KVKK (yurt dışı aktarım, Vercel satırı) |
| `court` | Tacir kullanıcılarla uyuşmazlıklarda yetkili mahkeme ve icra daireleri (ör. İstanbul (Çağlayan)). Tüketiciler için kanuni yetki kuralları geçerli | Koşullar (uyuşmazlıklar, tacir cümlesi) |

Saklama süresi teyidi bekleyenler (avukat): pazarlama izni kayıtları (ConsentEvent) izin sona
erdikten **3 yıl** sonra silinir (`consent_event_purge`, `src/lib/db/retention.ts`); yönetmelikteki
süreyle uyumu avukat teyit etmeli. Hesap silme akışı (henüz yok) verilmiş her izin için bir
`granted = false` olayı yazmalıdır; aksi halde kayıt silinmez.

Ayrıca karar bekleyenler: VERBIS kaydı/muafiyeti, başvuru adresinin `destek@` mi yoksa ayrı
bir `kvkk@` adresi mi olacağı (`src/lib/support.ts`), İYS kaydı (pazarlama kutusunu açmadan
önce).
