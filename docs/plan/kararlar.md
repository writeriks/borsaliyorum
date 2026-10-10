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
| — | Prod'daki `api/image-proxy` ve `api/content/get-preview` SSRF açıkları yeni sürümde SSRF korumalı servisle değiştirilir; eski route'lar S1'de kaldırılır. |
