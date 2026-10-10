# Auth Audit — "Sayfa açılıyor, 3-5 sn sonra birden login oluyor"

Tarih: 2026-10-10 · Kapsam: mevcut (v0.1) kod tabanı · Durum: yeniden yazımda çözülecek

## Belirti

Sayfa açılıyor, hiçbir yükleniyor göstergesi yok, kullanıcı "giriş yap" butonunu görüyor.
3-5 saniye sonra arayüz aniden giriş yapılmış hale geçiyor (çoğu zaman `/feed`'e atlıyor).

## Kök neden (zincir)

1. **Cookie'deki token 1 saatte ölüyor, cookie 24 saat yaşıyor.**
   `src/app/api/user/validate-user/route.ts:18` Firebase **ID token**'ı (ömrü 1 saat) doğrudan
   `identity` cookie'sine `Max-Age=86400` ile yazıyor. Token yenilendiğinde cookie güncellenmiyor
   (`onIdTokenChanged` dinlenmiyor). 1 saatten sonra sunucu her istekte süresi dolmuş token görüyor.

2. **Sunucu kullanıcıyı "anonim" sanıp meta-refresh ile landing'e atıyor.**
   `src/components/auth-wrapper/auth-wrapper.tsx:23` doğrulama başarısız olunca
   `<meta http-equiv="refresh">` ile `/`'e yönlendiriyor (tam sayfa yeniden yükleme).
   `src/app/[locale]/page.tsx:10` landing'de aynı doğrulama yine başarısız → çıkış yapmış gibi render.

3. **İstemci tarafında "auth çözülüyor" durumu yok.**
   `src/hooks/useUser.ts:158` — `isLoadingUser`, `onAuthStateChanged` ilk kez tetiklenene kadar
   `false`. Firebase oturumu IndexedDB'den geri yüklerken (yüzlerce ms) arayüz "anonim" kabul
   ediliyor ve `LoginContainer` ("Giriş yap" butonu) gösteriliyor
   (`src/components/user-profile-options/user-profile-options.tsx:105`).

4. **Ardından sıralı ağ istekleri:** Firebase restore → `validate-user` (cookie yenilenir) →
   `getUserById` (retry: 2) → `useAuthNavigation` `router.push('/feed')`
   (`src/hooks/useAuthNavigation.ts:21`). Toplam 3-5 sn; kullanıcı bu sürede yanlış durumu görüyor.

## Durumu ağırlaştıran bulgular

| # | Bulgu | Yer |
|---|-------|-----|
| A | `useUser()` 10 farklı bileşende çağrılıyor; her biri kendi `onAuthStateChanged` aboneliğini ve `validate-user` POST'unu başlatıyor. Tek bir provider yok. | `src/hooks/useUser.ts:145`, çağıranlar: main-layout, nav-bar, feed, discover, post-detail, tab-bar, notifications, … |
| B | Abonelik effect'i `firebaseUserId` ve `handleAuthStateChange`'e bağlı → kullanıcı değiştikçe yeniden abone olunuyor. | `src/hooks/useUser.ts:155` |
| C | `redux-persist` tüm root state'i (ui + user) localStorage'a yazıyor. `isAuthLoading`, `isAuthModalOpen` eski değerle geri geliyor; kullanıcı PII'si (email) localStorage'da kalıyor. | `src/store/redux-store.ts:23` |
| D | Masaüstü `isLoadingUser`, mobil `isAuthLoading` kullanıyor → iki farklı doğruluk kaynağı. | `user-profile-options.tsx:50`, `user-profile-options-mobile.tsx:39` |
| E | Cookie `HttpOnly`/`Secure` değil, ham ID token içeriyor → XSS ile çalınabilir. | `validate-user/route.ts:18` |
| F | Logout cookie'yi silmiyor (`Max-Age=86400`, boş değer) ve refresh token'ları iptal etmiyor. | `src/app/api/user/logout/route.ts:9` |
| G | Yönlendirmeler `redirect()` yerine meta-refresh ile → ekstra tam sayfa yükleme ve "flash". | `auth-wrapper.tsx`, `[locale]/page.tsx` |
| H | Kayıt/giriş akışı istemcide çok adımlı ve atomik değil (check → create → addUser → validate). Google kullanıcılarında `username = email` yazılıyor (e-posta herkese açık kullanıcı adı oluyor → KVKK riski). | `src/services/firebase-service/firebase-auth-service.ts:63` |
| I | Middleware'deki `handleAuth` tanımlı ama kullanılmıyor; koruma sayfa bazında ve tutarsız. | `src/middleware.ts:72` |
| J | `useValidateSession` hook'u ölü kod. | `src/hooks/useValidateSession.ts` |

## Yeniden yazımda hedef mimari

Ayrıntılar: `.claude/skills/auth-session/SKILL.md`. Özet:

- Firebase Auth sadece kimlik doğrulama için; giriş sonrası ID token sunucuya gönderilir,
  sunucu **Firebase session cookie** (`createSessionCookie`, 5-14 gün) üretir:
  `HttpOnly; Secure; SameSite=Lax; Path=/`.
- Sunucu tek doğruluk kaynağı: `getCurrentUser()` (React `cache`) layout'ta bir kez çalışır,
  sonuç `AuthProvider`'a `initialUser` olarak geçer → ilk HTML zaten doğru durumla gelir, flash yok.
- Korumalı sayfalarda `redirect()`; middleware sadece iyimser cookie varlığı kontrolü.
- İstemcide tek `AuthProvider`, durum üçlü: `loading | authenticated | anonymous`.
  `loading` iken "Giriş yap" asla gösterilmez; skeleton gösterilir.
- Giriş butonları anında geri bildirim verir (spinner + disabled), başarıda `router.refresh()`.
- Logout: `revokeRefreshTokens` + cookie `Max-Age=0` + istemci `signOut`.
- Kullanıcı kaydı sunucuda, session oluşturma sırasında idempotent `upsert`.
