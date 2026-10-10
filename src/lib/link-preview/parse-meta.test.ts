import { describe, expect, it } from 'vitest';

import {
  cleanPreviewText,
  extractPreviewMeta,
  extractPreviewMetaFromHtml,
  PREVIEW_TEXT_LIMITS,
} from './parse-meta';

const cp = (code: number): string => String.fromCodePoint(code);

async function* chunksOf(...parts: (string | Uint8Array)[]): AsyncGenerator<Uint8Array> {
  for (const part of parts) yield typeof part === 'string' ? new TextEncoder().encode(part) : part;
}

describe('extractPreviewMetaFromHtml', () => {
  it('og etiketlerini önceliklendirir', async () => {
    const meta = await extractPreviewMetaFromHtml(`
      <html><head>
        <title>Sayfa başlığı</title>
        <meta name="description" content="meta açıklama">
        <meta property="og:title" content="OG başlık">
        <meta property="og:description" content="OG açıklama">
        <meta property="og:site_name" content="KAP">
      </head><body><p>gövde metni</p></body></html>`);
    expect(meta).toEqual({ title: 'OG başlık', description: 'OG açıklama', siteName: 'KAP' });
  });

  it('og yoksa twitter:*, o da yoksa <title> ve meta description', async () => {
    expect(
      await extractPreviewMetaFromHtml(
        '<head><meta name="twitter:title" content="TW"><meta name="twitter:description" content="TD"><title>T</title></head>'
      )
    ).toEqual({ title: 'TW', description: 'TD', siteName: null });
    expect(
      await extractPreviewMetaFromHtml(
        '<head><TITLE>Düz başlık</TITLE><META NAME="Description" CONTENT="Açıklama"></head>'
      )
    ).toEqual({ title: 'Düz başlık', description: 'Açıklama', siteName: null });
  });

  it('ilk görülen değer geçerlidir; boş og:title <title>’a düşer', async () => {
    const meta = await extractPreviewMetaFromHtml(
      '<head><meta property="og:title" content="  "><meta property="og:description" content="bir"><meta property="og:description" content="iki"><title>Yedek</title></head>'
    );
    expect(meta).toEqual({ title: 'Yedek', description: 'bir', siteName: null });
  });

  it('gövdedeki metin ve </head> sonrası etiketler alınmaz', async () => {
    const meta = await extractPreviewMetaFromHtml(
      '<html><head></head><body><title>gövdede başlık</title><meta property="og:title" content="geç"><h1>Haber</h1></body></html>'
    );
    expect(meta).toEqual({ title: null, description: null, siteName: null });
  });

  it('HTML entity’leri çözülür', async () => {
    const meta = await extractPreviewMetaFromHtml(
      '<head><meta property="og:title" content="Ko&ccedil; Holding &amp; &#350;i&#x015F;e &quot;rekor&quot;"><title>x</title></head>'
    );
    expect(meta.title).toBe('Koç Holding & Şişe "rekor"');
  });

  // [HTML'deki öznitelik değeri, beklenen düz metin]. Değer HTML olarak yorumlanmaz; tek
  // işlem entity çözümüdür. Güvenlik render'daki escape'tedir (LinkPreviewCard testi).
  it.each([
    ['<script>alert(1)</script>', '<script>alert(1)</script>'],
    ['&quot;><img src=x onerror=alert(1)>', '"><img src=x onerror=alert(1)>'],
    ['&lt;script&gt;alert(1)&lt;/script&gt;', '<script>alert(1)</script>'],
    ['<svg/onload=alert(1)>', '<svg/onload=alert(1)>'],
    ['javascript:alert(1)', 'javascript:alert(1)'],
  ])('XSS içeren başlık düz metin olarak kalır: %s', async (attr, expected) => {
    const meta = await extractPreviewMetaFromHtml(
      `<head><meta property="og:title" content="${attr}"></head>`
    );
    expect(meta.title).toBe(expected);
  });

  it('<title> içindeki etiketler metin olarak okunur, çalıştırılabilir içerik üretilmez', async () => {
    const meta = await extractPreviewMetaFromHtml(
      '<head><title><script>alert(1)</script> Başlık</title></head>'
    );
    expect(meta.title).toBe('<script>alert(1)</script> Başlık');
  });

  it('kontrol ve bidi karakterleri temizlenir, boşluklar tekleşir', async () => {
    const dirty = `Kap${cp(0x202e)}moc.live${cp(0x202c)}${cp(0)}\n\t  haber${cp(0x200b)}${cp(0x7f)}${cp(0x85)}${cp(0x2028)}son`;
    const meta = await extractPreviewMetaFromHtml(
      `<head><meta property="og:title" content="${dirty}"></head>`
    );
    expect(meta.title).toBe('Kapmoc.live haber son');
  });

  it('başlık 120, açıklama 200, site adı 100 kod noktasına kırpılır', async () => {
    const meta = await extractPreviewMetaFromHtml(
      `<head><meta property="og:title" content="${'a'.repeat(500)}"><meta property="og:description" content="${'b'.repeat(500)}"><meta property="og:site_name" content="${'c'.repeat(500)}"></head>`
    );
    expect([...(meta.title ?? '')]).toHaveLength(PREVIEW_TEXT_LIMITS.title);
    expect(meta.title?.endsWith('…')).toBe(true);
    expect([...(meta.description ?? '')]).toHaveLength(PREVIEW_TEXT_LIMITS.description);
    expect([...(meta.siteName ?? '')]).toHaveLength(PREVIEW_TEXT_LIMITS.siteName);
  });

  it('başlık/meta yoksa tüm alanlar null', async () => {
    expect(await extractPreviewMetaFromHtml('<p>sadece gövde</p>')).toEqual({
      title: null,
      description: null,
      siteName: null,
    });
  });
});

describe('cleanPreviewText', () => {
  it('kırpma emoji/birleşik karakteri bölmez ve VARCHAR sınırını aşmaz', () => {
    const family = `${cp(0x1f468)}${cp(0x200d)}${cp(0x1f469)}${cp(0x200d)}${cp(0x1f467)}`;
    const text = 'a'.repeat(117) + family + 'zzzz';
    const out = cleanPreviewText(text, 120);
    expect(out).toBe(`${'a'.repeat(117)}…`);
    expect([...(out ?? '')].length).toBeLessThanOrEqual(120);
  });

  it('boş ya da yalnızca görünmez karakter → null', () => {
    expect(cleanPreviewText(undefined, 10)).toBeNull();
    expect(cleanPreviewText(`  ${cp(0x200b)}${cp(0xfeff)} `, 10)).toBeNull();
  });

  it('NFC’ye normalleştirir (ayrık ş tek karakter olur)', () => {
    expect(cleanPreviewText(`s${cp(0x327)}irket`, 50)).toBe('şirket');
  });
});

describe('extractPreviewMeta (akış)', () => {
  it('</head> görülünce durur, kalan parçalar okunmaz', async () => {
    let pulled = 0;
    async function* source(): AsyncGenerator<Uint8Array> {
      const enc = new TextEncoder();
      const parts = ['<html><head><title>Erken</title></head>', '<body>', 'x'.repeat(10), 'y'];
      for (const part of parts) {
        pulled += 1;
        yield enc.encode(part.padEnd(1100, ' '));
      }
    }
    const meta = await extractPreviewMeta(source(), 'utf-8');
    expect(meta.title).toBe('Erken');
    expect(pulled).toBe(1);
  });

  it('parçalara bölünmüş çok baytlı karakteri doğru çözer', async () => {
    const bytes = new TextEncoder().encode('<head><title>Şişecam</title></head>');
    const meta = await extractPreviewMeta(chunksOf(bytes.slice(0, 15), bytes.slice(15)), 'utf-8');
    expect(meta.title).toBe('Şişecam');
  });

  it('charset başlığı yoksa <meta charset> ile çözer (windows-1254)', async () => {
    // "Şirket" windows-1254'te: Ş=0xDE
    const head = new TextEncoder().encode('<head><meta charset="windows-1254"><title>');
    const title = Uint8Array.from([0xde, ...new TextEncoder().encode('irket')]);
    const tail = new TextEncoder().encode('</title></head>');
    const meta = await extractPreviewMeta(chunksOf(head, title, tail), null);
    expect(meta.title).toBe('Şirket');
  });

  it('Content-Type charset’i (iso-8859-9) kullanılır; bilinmeyen etiket UTF-8’e düşer', async () => {
    const latin5 = Uint8Array.from([
      ...new TextEncoder().encode('<title>'),
      0xfe,
      ...new TextEncoder().encode('ey</title>'),
    ]);
    expect((await extractPreviewMeta(chunksOf(latin5), 'iso-8859-9')).title).toBe('şey');
    expect((await extractPreviewMeta(chunksOf('<title>ok</title>'), 'x-bilinmeyen')).title).toBe(
      'ok'
    );
  });
});
