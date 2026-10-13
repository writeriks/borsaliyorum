---
name: pre-merge-gate
description: PR açmadan ve merge etmeden önce çalıştırılan zorunlu kalite kapısı — otomatik kontroller, code-reviewer ve test-engineer agent'larıyla inceleme, gerektiğinde security/legal incelemesi ve rapor formatı. "PR aç", "merge et", "değişiklikleri test et", "review yap", "hazır mı" denildiğinde veya bir iş bitip push edilmeden önce kullan.
---

# Pre-merge Gate

Hiçbir değişiklik bu kapıdan geçmeden PR'a ya da `main`'e gitmez. Kapı sırayla çalışır; bir
adım kırmızıysa sonrakine geçilmez, önce düzeltilir.

## 1. Kapsamı belirle

```bash
git fetch origin main
git diff --stat origin/main...HEAD
git diff origin/main...HEAD
```

Değişen dosyalara göre hangi ek incelemelerin gerektiğini işaretle:

| Değişiklik dokunuyorsa | Ek inceleme |
|------------------------|-------------|
| auth, session, middleware, rol/yetki, Server Action, API route | `security-reviewer` |
| dosya yükleme, kullanıcı içeriği render'ı, dış URL fetch | `security-reviewer` |
| kişisel veri alanı, analytics, 3. parti SDK, e-posta/bildirim, yasal metin, hisse/kripto gösterimi, ödeme | `legal-advisor` |
| yeni ekran/bileşen, metin | `ui-ux-designer` (hızlı UI review) |
| Prisma şema/migration | `architect` (geri alınabilirlik, veri kaybı) |

## 2. Otomatik kontroller (yerel)

Repo'daki script'leri kullan (yoksa eşdeğerini çalıştır):

```bash
npm ci
npm run type-check
npm run lint
npm run test            # unit + integration
npm run build
npm run test:e2e        # Playwright; değişiklik bir kullanıcı akışına dokunuyorsa zorunlu
```

Prisma şeması değiştiyse: `npx prisma migrate diff` ile migration'ın şemayla eşleştiğini ve
yıkıcı (DROP/ALTER ... TYPE) adım içerip içermediğini kontrol et.

Çıktıları özetle; kırmızıysa dur, düzelt, baştan çalıştır.

## 3. İnceleme

Kaynak tasarrufu kuralları için aşağıdaki "Kaynak bütçesi" bölümüne bak. Varsayılan:
**tek** `code-reviewer` agent'ı; güvenlik kapsamı varsa aynı agent'a security kontrol listesi
de verilir. Ayrı `security-reviewer` yalnız auth/oturum, yetki, dosya yükleme, dış fetch
(SSRF) ya da secret değişikliğinde. Her agent'a: base branch, diff kapsamı, amaç.

- `code-reviewer` → doğruluk, standartlara uyum, sadeleştirme bulguları (önem sıralı).
- `test-engineer` → eksik testleri yazar/çalıştırır, akışı uçtan uca doğrular, sonucu raporlar.

## 4. Bulguları işle

- **Blocker** (yanlış davranış, güvenlik, veri kaybı, yasal risk, kırık test): düzelt, 2. adıma dön.
- **Should-fix**: bu PR'da düzelt, ya da neden düzeltilmediğini PR açıklamasına yaz.
- **Nit**: isteğe bağlı.
Bir bulguya katılmıyorsan gerekçesini rapora yaz; sessizce atlama.

## 5. Rapor (PR açıklamasına da girer)

```
## Pre-merge raporu
Kapsam: <özet>, <n> dosya
Otomatik: type-check ✅ lint ✅ unit ✅ (x/y) build ✅ e2e ✅ (senaryolar: ...)
Code review: blocker 0 · should-fix n (düzeltildi m) · nit k
Test: eklenen testler <liste>; manuel doğrulanan akışlar <liste>
Security: <uygulanmadı | temiz | bulgular>
Legal: <uygulanmadı | temiz | avukat onayı gereken maddeler>
Bilinen riskler / takip işleri: ...
Karar: HAZIR | HAZIR DEĞİL (neden)
```

Karar "HAZIR" değilse PR açılmaz ya da draft olarak açılır. Merge kararı her zaman
kullanıcıdadır; agent'lar merge etmez.

## Kaynak bütçesi (zorunlu)

Claude kullanım limiti ve GitHub Actions dakikası sınırlı (2026-10: haftalık limit 3 günde,
Actions aylık kotası doldu). Bu yüzden:

- Aynı anda **en fazla 2** agent/görev çalışır (ör. 1 engineer + 1 reviewer).
- 50 satırın altındaki düzeltmeleri ana oturum kendisi review eder; agent açılmaz.
- Geliştirme sırasında yalnız ilgili testler koşulur (değişen dosyanın unit/int testi, ilgili
  e2e spec'i). **Tam e2e paketi** birleştirme (merge) öncesinde **bir kez** koşulur.
  `--repeat-each` gibi tekrar koşuları yalnız kararsız bir testin kök nedenini ararken.
- Aynı diff için ikinci review açılmaz; düzeltmeler önceki reviewer'a (SendMessage) gider.
- Kullanıcıya rapor kısa tutulur; ara durum mesajı yalnız bir şey değiştiğinde.

## CI

CI (`.github/workflows/ci.yml`) yalnız **main'e açılan PR'da** ve elle (workflow_dispatch)
koşar; agent dallarına push CI tetiklemez. Hızlı kontroller tek job'ta (`checks`), E2E onun
ardından. Agent dallarında aynı kontroller yerelde koşulur (2. adım).
