---
name: feature-workflow
description: Bir özelliği veya ekranı baştan sona geliştirme hattı — architect ile plan, ui-ux-designer ile tasarım, legal-advisor ile hukuki kontrol, fullstack-engineer ile uygulama, ardından pre-merge-gate (code-reviewer + test-engineer). Yeni özellik, yeni sayfa, yeniden yazımdaki bir modül veya "şunu yapalım" türü çok adımlı istekler için kullan.
---

# Feature Workflow

Ana oturum orkestra şefidir. Agent'ları sırayla (bağımlıysa) veya paralel (bağımsızsa) çağırır,
her aşamanın çıktısını bir sonrakine girdi olarak verir. Agent çıktıları kullanıcıya otomatik
gösterilmez; önemli kararları ve açık soruları kullanıcıya özetle.

## Aşamalar

1. **Netleştir** — Kullanıcının amacı, kapsam dışı olanlar, başarı ölçütü. Gerçekten
   kullanıcıya ait bir karar varsa (ürün önceliği, para, hukuki risk iştahı) sor; teknik
   varsayılanlar için sorma.

2. **Plan + tasarım + hukuk (paralel)** — Aynı mesajda başlat:
   - `architect`: veri modeli, sunucu/istemci sınırı, API/Server Action listesi, riskler,
     gerekiyorsa ADR (`docs/adr/NNNN-baslik.md`).
   - `ui-ux-designer`: akış, ekranlar (mobil + masaüstü), tüm durumlar, metinler (tr/en).
   - `legal-advisor`: yalnızca özellik kişisel veri, kullanıcı içeriği, hisse/kripto, ödeme,
     bildirim veya reklam içeriyorsa.

3. **Birleştir** — Çelişkileri çöz (ör. tasarımın istediği veri hukuken toplanamıyorsa
   tasarım değişir). Hukukun "YÜKSEK" riskleri ve avukat onayı gereken maddeler kullanıcıya
   bildirilir. Sonuç: uygulanabilir görev listesi + kabul kriterleri.

4. **Uygula** — `fullstack-engineer` (gerekirse bağımsız dilimler için birden fazla, ayrı
   worktree'lerde). Her dilim test ile birlikte gelir.

5. **Kapı** — `pre-merge-gate` skill'ini çalıştır (code-reviewer + test-engineer + gerekiyorsa
   security-reviewer / legal-advisor).

6. **Teslim** — Pre-merge raporu, açık sorular, takip işleri. PR yalnızca kullanıcı isterse
   açılır; merge kararı kullanıcınındır.

## Küçük işler

Tek dosyalık düzeltme, metin değişikliği gibi işler için 2-3. aşamalar atlanabilir; 5. aşama
(en azından otomatik kontroller + code-reviewer) atlanmaz.
