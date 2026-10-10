# Borsalıyorum

Türkiye odaklı borsa/yatırım sosyal platformu: kullanıcılar hisse ($THYAO), etiket (#bist100)
ve diğer kullanıcılar hakkında gönderi paylaşır, yorum yapar, takip eder. Birincil dil Türkçe,
ikincil İngilizce.

## Durum: Sıfırdan yeniden yazım

Mevcut kod (Next.js 14 + Prisma/Postgres + Firebase Auth + Redux + TanStack Query) **referans**
olarak duruyor; yeni sürüm baştan yazılacak. Eski koddan iş kuralı ve veri modelini öğren,
kalıplarını kopyalama. Bilinen sorunlar: `docs/audit/`.

## Altyapı ve kararlar

| Konu | Durum |
|------|-------|
| Hosting | Vercel |
| Veritabanı | PostgreSQL (Prisma) — NeonDB olduğu düşünülüyor, doğrulanacak |
| Auth + dosya depolama | Firebase Auth + Firebase Storage |
| İstemci durumu | Redux kaldırılacak; sunucu verisi + cache (Next.js cache, TanStack Query) |
| Moderasyon | Şikayet sistemi + ayrı admin paneli — öncelikli |
| Premium | İstenen; kapsam araştırılıyor |
| Hisse fiyat verisi | v1: fiyatsız (kod, ad, KAP ve TradingView linkleri). TradingView ücretsiz widget'ı BIST verisi göstermiyor. Fiyat için lisanslı dağıtıcı gerekli. Scraping yasak. |

## Ekip: agent'lar ve skill'ler

Her iş doğru uzmana gider. Ana oturum orkestra şefidir: işi böler, ilgili agent'a verir,
sonuçları birleştirir.

| Agent | Ne zaman |
|-------|----------|
| `architect` | Yeni modül/özellik tasarımı, teknoloji seçimi, veri modeli, ADR yazımı |
| `fullstack-engineer` | Kod yazma, refactor, bug fix, test yazma |
| `ui-ux-designer` | Ekran/akış tasarımı, design system, UX metni, erişilebilirlik |
| `legal-advisor` | KVKK, SPK/sermaye piyasası, 5651 içerik, tüketici, reklam, metinler |
| `code-reviewer` | PR/merge öncesi kod review (doğruluk, standartlar, sadeleştirme) |
| `test-engineer` | PR/merge öncesi test: eksik testleri yazar, akışları gerçekten çalıştırır |
| `security-reviewer` | Auth, yetkilendirme, kullanıcı içeriği, dosya yükleme içeren her değişiklik |
| `business-strategist` | Premium/abonelik, fiyatlandırma, gelir modeli, rakip analizi |

| Skill | İçerik |
|-------|--------|
| `coding-standards` | Stack, klasör yapısı, kod kuralları, test, git akışı |
| `auth-session` | Oturum mimarisi (eski "geç login" hatasının dersleri) |
| `design-system` | Token'lar, finans UI kuralları, durum (loading/empty/error) desenleri |
| `turkish-legal-compliance` | Mevzuat kontrol listeleri ve zorunlu metinler |
| `feature-workflow` | Bir özelliği plan → tasarım → hukuk → kod → review → test hattından geçirme |
| `pre-merge-gate` | PR açmadan / merge etmeden önce zorunlu kapı: otomatik kontroller + code-reviewer + test-engineer |

## Değişmez kurallar

- Kullanıcıya görünen her metin i18n dosyasında; varsayılan dil `tr`.
- Auth durumu çözülmeden "Giriş yap" ya da anonim UI gösterilmez (bkz. `auth-session`).
- Platform **yatırım tavsiyesi vermez**; hisse/kripto içeren her yüzeyde uyarı metni zorunlu
  (bkz. `turkish-legal-compliance`).
- Kişisel veri toplayan, saklayan ya da üçüncü tarafa gönderen her değişiklik `legal-advisor`
  incelemesinden geçer.
- Hiçbir değişiklik `pre-merge-gate` geçmeden PR'a ya da `main`'e gitmez. Merge kararı kullanıcınındır.
- Hukuki çıktılar bilgilendirme amaçlıdır; yayına almadan önce avukat onayı gerekir.

## Komutlar (mevcut kod)

```bash
npm run dev          # geliştirme sunucusu
npm run type-check   # tsc --noEmit
npm run eslint       # lint, 0 uyarı
npm run format       # prettier
```
