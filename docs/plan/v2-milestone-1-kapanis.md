# v2 Milestone 1 kapanış raporu

Tarih: 2026-10-13 · Dal: `claude/v2-s13` · Kapsam: S0-S13 (plan: `v2-milestone-1.md`).
Bu rapor bilgilendiricidir; merge ve canlıya geçiş kararı kullanıcınındır.

## 1. Ne bitti

S0-S12 dilimleri tamamlandı: kimlik doğrulama ve oturum (sunucu tek doğruluk kaynağı, flash yok),
onboarding, yasal sayfalar ve yeniden kabul akışı, composer (TipTap, entity vurgusu,
autocomplete), akış, gönderi detayı ve yorumlar, link önizleme (SSRF korumalı), beğeni/silme,
engelleme durumları, eski URL yönlendirme listesi (K7; cutover'da etkin).

S13 (sertleştirme) ile eklenenler:

- ENT-E02 kararsızlığının kök nedeni bulundu ve giderildi (aşağıda).
- AC-15 (300 ms skeleton eşiği) sahte saat ve tutulan yanıtla deterministik hale getirildi.
- Akış CLS 0,13 → 0 (composer iskeleti/kurulum yüksekliği kapalı composer ile eşitlendi).
- axe kapsamı genişledi: akış (kartlarla), `/paylas`, gönderi detayı ve 404 eklendi.
- `Popüler` integration testindeki zaman bombası düzeltildi (beğeni zamanı duvar saatine bağlıydı;
  2026-10-11 12:00Z sonrasında kırmızıydı).
- E2E başarısızlıklarında sayfa hatalarını (pageerror, console.error, 5xx) yakalayan teşhis
  (`tests/e2e/support/page-diagnostics.ts`); bozuk entity uyarısı içerik başına bir kez loglanır.
- `scripts/lighthouse-feed.ts`: production build üzerinde akış sayfası Lighthouse ölçümü.
- `docs/qa/ios-safari-checklist.md`: iOS Safari manuel kontrol listesi.

### Kök neden: ProseMirror `IndexSizeError`

Yerel Backspace DOM'u değiştirir; ProseMirror bunu bir `MutationObserver` mikro görevinde okur.
Arada React'in effect'inden gelen entity-dekorasyon işlemi (`composer.tsx`) görünümü eski modele
göre çizip seçimi DOM'a yazarken `IndexSizeError` fırlatıyordu. Effect içinde olduğu için
`/dev/composer` `error.tsx`'e düşüyordu. Düzeltme: `dispatchAfterDomSync`
(`src/features/composer/editor/dispatch-after-dom-sync.ts`) işlemi mikro göreve erteler,
gözlemci önce bekleyen kaydı işler. Test: `dispatch-after-dom-sync.test.tsx` (düzeltmeden önce
gerçekten `IndexSizeError` ile kırmızı, sonra yeşil).

## 2. Test sayıları ve kapılar (2026-10-13, yerel)

| Kontrol | Sonuç |
|---------|-------|
| type-check, lint (0 uyarı), format:check | temiz |
| test:unit (unit + dom) | 114 dosya, 1736 test |
| test:integration | 273 test (ilk koşuda 1 kırmızı: zaman bombası, düzeltildi; feed.int.test.ts 16/16 yeşil) |
| test:browser | 4 test |
| db:migrations:check, build (`SKIP_ENV_VALIDATION=1`), size:check | temiz |
| test:e2e (chromium + mobile) | 355 test geçti (4,9 dk, çıkış kodu 0) |
| axe serious/critical | 0 (kapsam: `/`, `/en`, giriş, kayıt, yasal sayfalar, onboarding, akış, detay, `/paylas`, 404; koyu + açık tema) |

### Lighthouse (mobil, lab, production build, `/akis`, 25 gönderi)

Betik: `npx tsx scripts/lighthouse-feed.ts` (Lighthouse 13.5.0, Chromium /opt/pw-browsers, yerel
Postgres + Auth emulator). **Bütçe (≥ 90) karşılanmadı.**

| Durum | Performans | LCP | TBT | CLS |
|-------|-----------|-----|-----|-----|
| Başlangıç (3 koşu) | 72 / 69 / 68 | 4,6-5,5 s | 250-430 ms | 0,015-0,138 |
| CLS düzeltmesinden sonra (3 koşu) | 76 / 83 / 76 (medyan 76) | 3,7-4,2 s | 310-410 ms | 0 |

Yapılan: en büyük tek neden olan CLS (composer iskeleti 68 px, gerçek composer 86 px; editör
kurulumu ek 8 px) giderildi. Kalan fark simüle edilen yavaş 4G + 4x CPU altında JS ağırlığından
geliyor (toplam ~430 KB sıkıştırılmış JS; composer parçası 99 KB, React DOM 71 KB, sonner+zod
41 KB, Radix tooltip/dropdown ~40 KB). Gönderi sayısını 3'e indirmek skoru yalnızca 79-84'e
çıkarıyor: sabit maliyet baskın. Bu sandbox'ta (4 çekirdek, iz kaydı açık) ölçüm gürültülü;
**skor Vercel preview'da yeniden ölçülmeli**. Önerilen sıradaki işler (M2 başı, ölçerek):
composer parçasını boşta/etkileşimde yüklemek, tooltip/dropdown'ı kart başına değil tembel
yüklemek, `zod`'u istemci paketinden çıkarmak (`getClientEnv`), sonner'ı ilk toast'a ertelemek.

## 3. Açık riskler

1. **Lighthouse 90 altında** (yukarıda). Canlıda Vercel/CDN ile gerçek skor farklı olabilir.
2. **Yasal metinler avukat onayı bekliyor**; production build yer tutucular (`[[ph:…]]`)
   doluyken geçer, doluyken yayın kapısı durdurur (aşağıdaki liste).
3. **Yorum composer iskeleti** artık gönderi composer'ı yüksekliğinde (86 px); detay sayfasında
   kapalı yorum composer'ı daha kısaysa küçük bir kayma olabilir (ölçülmedi, takip işi).
4. **Rate limit**: bellek içi kovalar sunucusuz ortamda örnek başınadır; asıl taban koruma
   Vercel Firewall kuralı (M2 girdisi, aşağıda).
5. **Google profil fotoğrafı** gösterilmiyor: `lh3.googleusercontent.com` güvenli görsel
   listesinde yok (`src/lib/media/safe-src.ts`), avatar baş harfe düşer.
6. **E-posta altyapısı yok**: yasal değişiklik duyurusu (30 gün önceden e-posta) yapılamaz.
7. E2E kararsızlık geçmişi: ENT-E02 kök nedeni giderildi ama bu yerelde yük altında
   (`--repeat-each`) yeniden üretilemediği için düzeltme jsdom'da mekanizma düzeyinde
   doğrulandı; CI'da (main'e PR) izlenmeli.

## 4. M2 girdileri

- **Moderasyon ve admin paneli** (öncelikli): şikayet sistemi, kaldırma/geri alma, "moderasyonla
  kaldırıldı" gösterimi (K-A; veri hazır, UI yok), telif bildirim kanalı.
- **Premium**: v1 özellik önerisi hazır; abonelik, fiyatlandırma, tüketici metinleri.
- **Yorum sayacı farkı**: kart sayısı yalnız silinmemiş yorumları sayar; engelleme/gizleme
  nedeniyle listelenmeyen yorumlarla sayaç arasında fark olabilir. Tek tanım belirlenecek.
- **Sağ kolon tazeleme**: trend etiketler ve takip edilen hisseler önbellekten gelir;
  takip/gönderi sonrası ve süre bazlı tazeleme stratejisi netleştirilecek.
- **md+ composer dialog**: masaüstünde modal composer (`variant: dialog`) akışa bağlanacak;
  M1'de mobilde `/paylas` sayfası, masaüstünde satır içi composer.
- **Landing son gönderiler**: anonim ana sayfada herkese açık son gönderiler (SEO, boş durum).
- **Vercel Firewall kuralı**: `/api/autocomplete/*`, `/api/link-preview`, yorum ve oturum uçları
  için IP bazlı rate limit (ADR-0001, ADR-0002); uygulama içi sınırlar yedek.
- **Google avatar host'u**: `lh3.googleusercontent.com`'u güvenli görsel listesine ekleme ya da
  avatarı kendi depolamamıza kopyalama (KVKK/yurt dışı aktarım açısından legal inceleme).
- **v1 diğer URL yönlendirmeleri**: `LEGACY_REDIRECTS` yalnız `/posts/:id` (tr, en, önek
  yok) yollarını kapsıyor. ADR-0001'deki `/tr/feed`, `/tr/users/:u`, `/tr/stocks/:t`,
  `/tr/tags/:t` hedef sayfaları (profil, hisse, etiket) M1'de olmadığından eklenmedi; sayfalar
  gelince eklenecek. Cutover öncesi v1 trafik alan diğer yollar da çıkarılmalı.
- **Giriş kayıtlarında IP yoksa ne olacak (legal)**: K-B production'da IP alınamazsa yazmayı
  reddeder. 5651 kayıt yükümlülüğü ile kullanılabilirlik arasındaki bu tercih avukatla
  teyit edilmeli (alternatif: yazmaya izin ver + "IP yok" olayı); reddetme sıklığı izlenmeli.
- Performans: Lighthouse ≥ 90 için JS diyeti (bölüm 2).
- GIF sağlayıcısı (K10, KVKK), gönderi düzenleme kararı, e-posta altyapısı.

## 5. Açık legal sorular (durum)

Kaynaklar: `docs/legal/README.md` (sayfa/onay tablosu), `docs/legal/auth-metinleri.md`,
`docs/legal/composer-metinleri.md`, `docs/plan/kararlar.md`.

- **Tüm yasal sayfalar "Bekliyor"** (avukat onayı alınmadı): KVKK Aydınlatma, Çerez Politikası,
  Kullanım Koşulları, Yatırım Uyarısı, Topluluk Kuralları, kayıt ekranı metinleri, yeni sürüm
  kabul ekranı. Onaylanana kadar canlıya almak kullanıcı kararıdır; metinler bilgilendirme
  amaçlıdır.
- **Doldurulacak yer tutucular** (yayın kapısı üretimi durdurur): `company`, `address`, `mersis`,
  `kep`, `dbRegion` (Neon bölgesi), `transferSafeguard` (md.9 dayanağı), `appRegion` (Vercel
  bölgesi; depodan doğrulanamadı), `court`.
- **Avukata sorulacaklar**: yurt dışı aktarım dayanağı (Firebase/Vercel/Neon, standart sözleşme
  ve Kurum bildirimi), pazarlama kutusunun tek kutuyla 6563 onayı + KVKK açık rızası olup
  olamayacağı (2026/347 ilke kararı), TBK genel işlem koşulları kabulü, saklama süreleri
  (ConsentEvent 3 yıl, 5651 logları, içerik), 18+ beyanı yeterliliği, kısa/tam yatırım uyarısı,
  sponsorlu gönderide cashtag yasağı, "Reklam" etiketinin İngilizcede korunması, og:image
  saklama (FSEK).
- **Karar bekleyenler**: VERBIS kaydı/muafiyeti, başvuru adresi (`destek@` / `kvkk@`), İYS
  kaydı (pazarlama kutusu `MARKETING_CONSENT_ENABLED` kapalı kalır), GIF sağlayıcısı, telif
  bildirim kanalı, gönderi düzenleme.
- **Kapanmış kararlar**: K1-K11, K-A, K-B, K-C (`kararlar.md`).

## 6. Canlıya geçiş kontrol listesi (kullanıcının yapacakları)

Zaten yapıldı: GitHub'a `DATABASE_URL` secret'ı eklendi; Vercel'deki `DATABASE_URL` aynı Neon DB.

1. **Avukat onayı**: `docs/legal/README.md` tablosundaki metinleri avukata gönder; onayı tabloya
   işle. Onaysız yayın riski sana ait.
2. **Yer tutucuları doldur** (`messages/legal/{tr,en}.json` → `placeholders`; metinlerdeki
   `[[ph:…]]` işaretlerini düz metinle değiştir, `PLACEHOLDER_KEYS`'ten anahtarı sil). Aksi
   halde production build durur.
3. **Neon ve Vercel bölgelerini teyit et** (`dbRegion`, `appRegion`); Vercel bölgesini
   `fra1` yap ya da gerçek değeri yaz.
4. **Vercel ortam değişkenleri** (Production + Preview): `FIREBASE_PROJECT_ID`,
   `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_*`
   (5 adet), `NEXT_PUBLIC_SITE_URL`, `IP_ENCRYPTION_KEY` (yeni üret:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`; parola kasasında
   yedekle, kaybolursa kayıtlı IP'ler çözülemez), `STOCKS_REVALIDATE_SECRET` (en az 32 karakter).
   `FIREBASE_AUTH_EMULATOR_HOST` / `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` tanımlı olmamalı.
5. **GitHub**: `Settings > Secrets`: `DATABASE_URL` (var), `STOCKS_REVALIDATE_SECRET`
   (Vercel'dekiyle aynı), `FIREBASE_*` (retention işi için); `Variables`: `SITE_URL`.
   `RETENTION_PURGE_EXECUTE` ve `ORPHAN_PURGE_ENABLED` değişkenlerini önce **tanımlama** (kuru
   koşu); çıktıyı gördükten sonra aç.
6. **Veritabanı migration'ları**: yerelde `npm run db:migrations:check` temiz; main'e merge
   sonrası migration'ları Neon'a **unpooled** URL ile uygula (`prisma migrate deploy`). Önce
   Neon'da dal/yedek al (rollback).
7. **Hisse listesini doldur**: `Sync BIST stocks` workflow'unu elle tetikle (boş `Stock` tablosu
   = hisse önerisi ve cashtag doğrulaması çalışmaz).
8. **Preview'da dene**: PR'dan gelen Vercel preview'unda giriş, kayıt, gönderi, yorum, çıkış;
   `docs/qa/ios-safari-checklist.md`'yi gerçek iPhone'da uygula; Lighthouse'ı preview adresine
   karşı çalıştır (hedef ≥ 90; altındaysa M2 performans işi).
9. **Vercel Firewall**: rate limit kuralını ekle (autocomplete, link önizleme, yorum, oturum).
10. **Alan adı geçişi (cutover)**: ADR-0001 cutover adımları. Alan adını v2 projesine taşı;
    rollback = alan adını eski projeye geri taşımak. `LEGACY_REDIRECTS` yönlendirmelerini eski
    URL'lerle dene. Herkes bir kez yeniden giriş yapacak (K3): kısa duyuru hazırla.
11. **Canlı sonrası ilk gün**: logları izle (IP alınamadığı için reddedilen yazma, 5xx,
    `entity atlandı` uyarıları); Google ile giriş ve avatarlar; 14 gün rollback penceresi
    bitince `legacy/` ve contract migration'ları sil.
