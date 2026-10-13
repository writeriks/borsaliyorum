import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * `lib/entities` istemci bundle'ına da girer (composer, ADR-0002 Karar 2): Node API'si,
 * `server-only` ya da üçüncü taraf paket import edemez. Kaynak dosyalar statik taranır.
 */
const dir = fileURLToPath(new URL('.', import.meta.url));
const sources = readdirSync(dir)
  .filter(name => name.endsWith('.ts') && !name.endsWith('.test.ts') && name !== 'test-utils.ts')
  .map(name => ({ name, code: readFileSync(`${dir}/${name}`, 'utf8') }));

const allFiles = readdirSync(dir)
  .filter(name => name.endsWith('.ts'))
  .map(name => ({ name, code: readFileSync(`${dir}/${name}`, 'utf8') }));

const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;
const NODE_GLOBALS_RE =
  /\b(?:process|Buffer|__dirname|__filename|require|global|setImmediate|module\.exports)\b/;

const stripComments = (code: string): string =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('lib/entities istemci-güvenli', () => {
  it('kaynak dosyalar bulunur', () => {
    expect(sources.map(s => s.name)).toEqual(
      expect.arrayContaining(['index.ts', 'parse.ts', 'normalize.ts', 'trigger.ts'])
    );
  });

  it('import taraması boş geçmez', () => {
    const parse = sources.find(s => s.name === 'parse.ts');
    expect([...(parse?.code ?? '').matchAll(IMPORT_RE)].length).toBeGreaterThan(0);
  });

  it.each(sources)('$name yalnızca kardeş modülleri import eder', ({ code }) => {
    const specifiers = [...code.matchAll(IMPORT_RE)].map(m => m[1]);
    for (const specifier of specifiers) expect(specifier).toMatch(/^\.\/[\w-]+$/);
  });

  it.each(sources)('$name Node global’i kullanmaz', ({ code }) => {
    expect(stripComments(code)).not.toMatch(NODE_GLOBALS_RE);
  });

  // Trojan Source: kaynakta görünmez bidi/kontrol/biçim karakteri yerine `\u` kaçışı kullanılır.
  it.each(allFiles)('$name görünmez bidi/kontrol karakteri içermez', ({ code }) => {
    expect(code).not.toMatch(/(?![\n\r\t])[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]/u);
  });
});
