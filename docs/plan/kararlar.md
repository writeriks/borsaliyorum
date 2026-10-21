# v2 kararları (kullanıcı onayı: 2026-10-10)

Bu dosya ADR'lerdeki "karar gerekli" maddelerinin sonucudur ve çelişki halinde ADR'lerin önündedir.

| # | Karar |
|---|-------|
| K1 | **v2 ayrı dizin/proje değil.** Mevcut repo kökünde, mevcut Next.js uygulamasının yerine yazılır; aynı Vercel projesi. Eski kod referans için `legacy/` altına taşınır ve build/lint/tsconfig dışında tutulur. Uygulamanın aktif kullanıcısı yok; geçiş koruması (S0, ignored build step) gerekmez. |
| K2 | Aynı Neon DB. Şema değişiklikleri `prisma migrate` ile; testler **asla** bu DB'ye bağlanmaz (yerel/CI Postgres). |
| K3 | Geçişte herkes bir kez yeniden giriş yapar. |
| K4 | Gönderide cashtag zorunluluğu kalkar. |
| K5 | Bilinmeyen cashtag gönderiyi reddeder; editör önceden işaretler. |
| K6 | Link önizlemede M1'de görsel yok. |
| K7 | Türkçe URL'ler (`/akis`, `/gonderi/:id`, `/u/:kullanici`, `/hisse/:kod`, `/etiket/:slug`), eski URL'ler 301. |
| K8 | Çıkış = tüm cihazlardan çıkış. |
| K9 | **Ayrı Firebase projesi yok.** Testler Firebase Auth emulator kullanır; preview/prod aynı Firebase projesi. |
| K10 | Görsel/GIF yükleme M1'de yok. GIF sağlayıcısı (KVKK) M2'de. |
| K11 | **Yorum sınırı 500 grafem** (gönderi 1000). İstemci ve sunucu aynı sabiti kullanır: `src/lib/content-limits.ts` → `CONTENT_MAX_CHARS`. ADR-0002 Karar 3'teki "yorumda 1000, açık soru" bununla kapanır. |
| K-A | (2026-10-11, S10 review; kullanıcı adına koordinatör) Gönderi/yorum silme: sahibi **veya** moderatör/admin (rol DB'den, `SecurityRole`). Moderatör kaldırması `ContentEvent('moderation.remove')` + `removedByModeration` işareti (sahibine "moderasyonla kaldırıldı"; UI M2). ADR-0002 Karar 7 "S10 review kararları". |
| K-B | (2026-10-11) Production runtime'da istemci IP'si alınamazsa ContentEvent üreten yazma reddedilir (`INTERNAL`) ve error loglanır; dev/test'te olay atlanır + log. |
| K-C | (2026-10-11) İçerik sahibiyle iki yönlü engel varsa ya da sahibin hesabı etkin değilse yorum ve beğeni `FORBIDDEN`. |
| K12 | (2026-10-21, kullanıcı kararı) Site henüz kullanıcı almıyor; yeni tasarım canlıda görülebilsin diye yasal yer tutucu kapısı **geçici olarak uyarıya düşürüldü** (`next.config.ts` → `LEGAL_GATE_DEFERRED`). Süre boyunca production da `noindex`. **İlk gerçek kullanıcıdan önce** yer tutucular doldurulur ve bayrak `false` yapılır. |
| K13 | (2026-10-21) Vercel build'i **webpack** ile (`vercel-build`: `next build --webpack`). Turbopack, harici paketleri (`firebase-admin`, `pg`) `.next/node_modules/<paket>-<hash>` kısayollarıyla yüklüyor ve Vercel fonksiyonunda bunlar çözülemiyor ("Failed to load external module", next.js #86652, #87737). Yerel/CI/E2E Turbopack'te kalır; webpack build'i ana E2E akışlarıyla doğrulandı (23/23). Upstream düzelince kaldırılır. |
| K14 | (2026-10-21) Node **24** (`engines: 24.x`, `.nvmrc` 24.12.0). `firebase-admin` → `jwks-rsa@4` → `jose@6` yalnız ESM; Vercel'in Node 22 çalışma ortamında `require()` ile yüklenemedi (`ERR_REQUIRE_ESM`). Firebase SDK'ları da Node ≥ 24.12 istiyor. |
| — | Prod'daki `api/image-proxy` ve `api/content/get-preview` SSRF açıkları yeni sürümde SSRF korumalı servisle değiştirilir; eski route'lar S1'de kaldırılır. |
