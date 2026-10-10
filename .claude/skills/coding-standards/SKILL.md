---
name: coding-standards
description: Borsalıyorum kod standartları — stack, klasör yapısı, TypeScript/React/Next.js kuralları, veri erişimi, hata yönetimi, test ve git akışı. Bu repoda herhangi bir kod yazarken, refactor ederken, review yaparken veya yeni dosya/modül oluştururken kullan.
---

# Kod Standartları

Yeni sürüm sıfırdan yazılıyor. Eski koddaki kalıpları (Redux'ta sunucu verisi, meta-refresh
yönlendirme, her bileşende global abonelik) **taşıma**.

## Stack (varsayılan — değiştirmek için ADR gerekir)

| Katman | Seçim | Not |
|--------|-------|-----|
| Framework | Next.js (App Router, son kararlı sürüm) | Server Components varsayılan |
| Dil | TypeScript `strict: true`, `noUncheckedIndexedAccess: true` | `any` yasak |
| DB | PostgreSQL + Prisma | Migration'lar `prisma migrate`, asla `db push` prod'da |
| Auth | Firebase Auth + sunucu session cookie | Bkz. `auth-session` skill |
| Sunucu durumu (istemci) | TanStack Query | Sadece istemcide gereken etkileşimli veri için |
| İstemci UI durumu | React state / context; gerekirse Zustand | Redux + redux-persist kullanılmaz |
| Form | react-hook-form + Zod | Şema sunucu ve istemcide ortak |
| UI | Tailwind + shadcn/ui (Radix) | Bkz. `design-system` skill |
| i18n | next-intl | `tr` varsayılan |
| Test | Vitest + Testing Library, Playwright (E2E) | |

Sürüm eklerken `npm view <paket> version` ile güncel kararlı sürümü kontrol et; hafızadan
sürüm yazma.

## Klasör yapısı (feature-first)

```
src/
  app/[locale]/(public)/...      # anonim erişilebilir sayfalar
  app/[locale]/(app)/...         # oturum gerektiren sayfalar (layout'ta guard)
  app/api/...                    # sadece webhook/3. parti için; iç mutasyonlar Server Action
  features/<feature>/
    components/                  # o özelliğe özel UI
    server/                      # queries.ts (okuma), actions.ts (yazma), *.test.ts
    schemas.ts                   # Zod şemaları
    types.ts
  components/ui/                 # shadcn primitive'leri, iş mantığı yok
  lib/                           # db, auth, logger, rate-limit, utils
  i18n/  messages/
```

Bir feature başka bir feature'ın `server/` klasörünü import etmez; ortak ihtiyaç `lib/`'e çıkar.

## Kurallar

**Sunucu/istemci sınırı**
- Bileşen varsayılan olarak Server Component. `'use client'` sadece etkileşim gereken yaprak
  bileşenlerde.
- Veri, sunucuda `features/*/server/queries.ts` içinden okunur. Her sorgu fonksiyonu yetki
  kontrolünü **kendi içinde** yapar (Data Access Layer). Sayfa seviyesinde kontrol yetmez.
- Yazma işlemleri Server Action: `'use server'` → Zod ile parse → `requireUser()` → yetki →
  DB → `revalidatePath/Tag`. Dönüş tipi `{ ok: true, data } | { ok: false, error: ErrorCode }`.
- Yönlendirme `redirect()` / `notFound()` ile. `<meta http-equiv="refresh">` yasak.

**Global abonelikler**
- Auth, tema, bildirim soketi gibi global kaynaklara **tek bir provider** abone olur; bileşenler
  context'ten okur. Hook içinde `onAuthStateChanged` gibi abonelik açan kodu birden çok
  bileşenin çağırması yasak (eski kodda 10 kopya vardı).

**Async UI**
- Her async yüzeyin 4 durumu tasarlanır: loading, empty, error, success. Belirsiz durumda
  (örn. auth çözülüyor) "varsayılan değer" ile render etme; skeleton göster.
- Mutasyonlarda buton anında `disabled` + spinner. Optimistic update yapılıyorsa hata durumunda
  geri al ve toast göster.

**Tipler ve doğrulama**
- Dış dünyadan gelen her veri (form, URL param, webhook, 3. parti API) Zod ile parse edilir.
- Prisma modelleri istemciye doğrudan gönderilmez; `toPublicUser()` gibi DTO fonksiyonları
  ile alan seçilir (e-posta, firebaseUid vb. sızmasın).
- Enum yerine `as const` nesne + union tip.

**Hata yönetimi ve log**
- Kullanıcıya teknik hata mesajı gösterilmez; `ErrorCode` → i18n mesajı.
- Sunucu hataları yapılandırılmış logger ile (`lib/logger`), kişisel veri maskelenerek loglanır.
- `catch {}` ile hata yutmak yasak; en azından loglanır.

**Kullanıcı içeriği**
- Gönderi/yorum metni düz metin olarak saklanır, render'da escape edilir. `dangerouslySetInnerHTML`
  yasak. Mention/hashtag/cashtag parse'ı tek bir yardımcıda.
- Yüklenen görseller: MIME + boyut + piksel limiti sunucuda doğrulanır, EXIF temizlenir.
- Mutasyonlarda kullanıcı bazlı rate limit.

**Performans**
- Liste sayfaları cursor-based pagination (offset değil).
- N+1 yok: Prisma `include/select` ile tek sorgu ya da batch.
- Reklam ve widget alanları sabit boyutlu yer tutucu ile (CLS < 0.1).

**Stil**
- Prettier: tek tırnak, `printWidth: 100`, `trailingComma: es5`, `arrowParens: avoid`.
- Bileşen: arrow function, named export. Dosya adı kebab-case.
- Fonksiyonlarda açık dönüş tipi (export edilenlerde).
- Yorum "neden"i anlatır, "ne"yi değil.

## Test

- Her Server Action ve query için unit test (yetki reddi senaryosu dahil).
- Kritik akışlar Playwright ile: kayıt, giriş, oturum kalıcılığı (sayfa yenileme sonrası flash
  olmaması), gönderi oluşturma, çıkış.
- Bug fix → önce hatayı yakalayan test, sonra düzeltme.

## Bitti tanımı

Bir değişiklik şunlar sağlanmadan "bitti" sayılmaz:
1. `type-check`, `lint`, test'ler temiz.
2. Yeni metinler `tr` ve `en` i18n dosyalarında.
3. Loading/empty/error durumları var.
4. Kişisel veri veya kullanıcı içeriği dokunuyorsa `security-reviewer` + `legal-advisor` notu.

## Git

- `main`'e doğrudan push yok; feature branch + PR.
- Commit mesajı: `feat(feed): ...`, `fix(auth): ...`, `chore: ...` (Conventional Commits).
- Bir PR tek bir amaca hizmet eder.
