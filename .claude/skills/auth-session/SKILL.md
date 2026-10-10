---
name: auth-session
description: Borsalıyorum kimlik doğrulama ve oturum mimarisi — Firebase Auth + httpOnly session cookie, sunucu tarafı kullanıcı çözümleme, AuthProvider, korumalı rotalar, giriş/çıkış/kayıt akışları ve UX kuralları. Auth, login, logout, kayıt, session, cookie, middleware, korumalı sayfa veya "kullanıcı giriş yapmış mı" mantığına dokunan her işte kullan.
---

# Auth & Session

Eski sürümde kullanıcı sayfayı açınca 3-5 sn "anonim" görünüp sonra aniden login oluyordu.
Neden: cookie'de 1 saatlik ID token, istemcide "çözülüyor" durumunun olmaması, 10 ayrı
`onAuthStateChanged` aboneliği, meta-refresh yönlendirmeler. Ayrıntı: `docs/audit/2026-10-auth-audit.md`.
Bu skill o hataların tekrarlanmamasını sağlar.

## Temel ilke

**Sunucu tek doğruluk kaynağıdır.** İlk HTML, kullanıcının giriş durumunu zaten doğru
yansıtır. İstemci auth durumunu "keşfetmek" zorunda kalmaz.

## Akış

```
[Giriş formu / Google] --Firebase client SDK--> ID token
      --POST /api/auth/session (idToken, CSRF)--> sunucu
           verifyIdToken (auth_time < 5 dk)
           upsert User (firebaseUid)            // kayıt da burada, idempotent
           createSessionCookie(expiresIn: 14 gün)
           Set-Cookie: __session=...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=...
      <-- { user: PublicUser }
istemci: firebase signOut() (client persistence gerekmez) → router.refresh()
```

Sonraki her istek: `getCurrentUser()` → `verifySessionCookie(cookie, checkRevoked)` → DB'den
kullanıcı. React `cache()` ile istek başına bir kez çalışır.

Çerez adı `__session` (Firebase Hosting/CDN'lerin geçirdiği tek cookie adı; başka host'ta da
zararsız).

## Bileşenler

- `lib/auth/session.ts` — `createSession(idToken)`, `getCurrentUser()`, `requireUser()`
  (yoksa `redirect('/giris?next=...')`), `destroySession()`.
- `app/[locale]/(app)/layout.tsx` — `const user = await requireUser()`; `<AuthProvider initialUser={user}>`.
- `app/[locale]/(public)/layout.tsx` — `getCurrentUser()` opsiyonel; landing'de girişliyse
  `redirect('/akis')` **sunucuda**.
- `middleware.ts` — sadece i18n + iyimser kontrol: `(app)` rotasında `__session` cookie'si
  hiç yoksa login'e yönlendir. Gerçek doğrulama middleware'de yapılmaz.
- `AuthProvider` (client) — `initialUser` ile başlar; durum:
  `{ status: 'authenticated', user } | { status: 'anonymous' }`. Sunucudan geldiği için
  sayfa yüklemesinde `loading` yoktur. `loading` sadece giriş/çıkış işlemi sürerken kullanılır.
- `useAuth()` — context okur, abonelik açmaz.

## UX kuralları (zorunlu)

1. Auth durumu bilinmiyorsa (`loading`) "Giriş yap" butonu **asla** render edilmez; aynı
   boyutta skeleton gösterilir.
2. Giriş/kayıt butonuna basıldığı an buton `disabled` + spinner + metin "Giriş yapılıyor…".
   Google popup açıkken de bu durum korunur.
3. Başarılı girişten sonra kullanıcı bulunduğu sayfada kalır (`router.refresh()`) ya da `next`
   parametresine gider. Rastgele `/akis`'e atlatma.
4. Hata mesajları Firebase kodlarından i18n'e eşlenir (`auth/wrong-password` →
   "E-posta veya şifre hatalı."). Ham Firebase mesajı gösterilmez. Hangi alanın yanlış olduğu
   söylenmez (hesap varlığı sızmasın).
5. Oturum süresi dolarsa: Server Action `UNAUTHENTICATED` döner → istemci "Oturumunuz sona erdi"
   toast'ı + login modalı, mevcut taslak (ör. yazılmakta olan gönderi) korunur.
6. Çıkış anında UI anonime döner; arka planda sunucu çağrısı biter.

## Güvenlik

- Cookie: `HttpOnly; Secure; SameSite=Lax; Path=/`. Asla localStorage'da token/kullanıcı PII'si.
- `/api/auth/session` POST: `Origin` başlığı kendi domain'imiz değilse 403; ayrıca double-submit
  CSRF token.
- Session oluştururken `decoded.auth_time` son 5 dk içinde olmalı (eski token ile session
  üretilmesin).
- Çıkış: `revokeRefreshTokens(uid)` + `Set-Cookie: __session=; Max-Age=0` + istemci `signOut`.
- Şifre değiştirme / hesap silme gibi hassas işlemler taze giriş ister (auth_time kontrolü).
- E-posta doğrulanmamış kullanıcı: okuyabilir, gönderi/yorum yazamaz (spam ve 5651 sorumluluğu).
- `getCurrentUser()` dönüşü `PublicUser` DTO'sudur; firebaseUid ve e-posta sadece sahibine.
- Rol kontrolü (`admin`, `moderator`) sunucuda, DB'den; istemci rol bilgisi sadece UI içindir.

## Kayıt kuralları

- Kullanıcı adı: kullanıcı seçer, `^[a-z0-9_]{3,20}$`, rezerve liste (admin, borsaliyorum, spk…).
  Google ile girişte kullanıcı adı otomatik e-posta **olamaz**; onboarding adımında sorulur.
- KVKK aydınlatma metni kayıt ekranında linklenir; pazarlama izni ayrı, işaretsiz checkbox
  (bkz. `turkish-legal-compliance`).
- Yaş beyanı (18+ ya da veli onayı) kayıt sırasında alınır.

## Kabul testleri (Playwright)

- Girişli kullanıcı korumalı sayfayı yenilediğinde ilk boyamada avatarı görür; "Giriş yap"
  hiçbir karede görünmez (screenshot/DOM assert).
- 1 saatten uzun beklemiş oturum (session cookie) hâlâ geçerli.
- Çıkış sonrası geri tuşu korumalı içeriği göstermez.
- Süresi dolmuş/iptal edilmiş cookie → login'e yönlendirme, döngü yok.
