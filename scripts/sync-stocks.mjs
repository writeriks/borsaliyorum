/**
 * BIST hisse listesini Stock tablosuna ekler. v2'de otomatik tamamlama doğrudan DB'den
 * okunduğu için kaynak koda (eski src/tickers.ts) dosya üretilmez.
 *
 * Girdi: her satırı "KOD;ŞİRKET ADI" (ya da virgül/tab ile ayrılmış) olan bir CSV.
 * Liste KAP'ın BIST şirketler sayfasından alınır; fiyat verisi içermez.
 *
 *   node scripts/sync-stocks.mjs hisseler.csv            # dry-run: sadece rapor
 *   node scripts/sync-stocks.mjs hisseler.csv --apply    # DB'ye yazar
 *   ... --apply --max-new=700                            # ilk toplu senkronizasyon için limiti aşar
 *
 * Mevcut hisseler silinmez ve adları değişmez (gönderiler bu kayıtlara bağlı);
 * listede olmayanlar sadece raporlanır.
 */
import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';

const TICKER_RE = /^[A-Z0-9]{3,6}$/;
const HEADER_WORDS = new Set(['KOD', 'CODE', 'TICKER', 'SEMBOL', 'HISSE']);
// Normal bir haftada 0-3 halka arz olur; fazlası KAP yapısının değiştiğine işaret eder
const DEFAULT_MAX_NEW = 15;

export const parseStockCsv = text => {
  const stocks = new Map();
  const invalid = [];

  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) return;

    // Sadece ilk ayraçtan böl; şirket adında virgül olabilir
    const separator = line.search(/[;\t]/);
    const ticker = (separator === -1 ? line : line.slice(0, separator))
      .trim()
      .replace(/^"|"$/g, '');
    const companyName = line
      .slice(separator + 1)
      .trim()
      .replace(/^"|"$/g, '')
      .replace(/\s+/g, ' ');

    if (HEADER_WORDS.has(ticker)) return;
    if (separator === -1 || !TICKER_RE.test(ticker) || !companyName) {
      invalid.push(`${i + 1}: ${line}`);
      return;
    }
    if (!stocks.has(ticker)) stocks.set(ticker, companyName);
  });

  return { stocks, invalid };
};

const main = async () => {
  const [csvPath] = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const apply = process.argv.includes('--apply');
  const maxNewArg = process.argv.find(arg => arg.startsWith('--max-new='));
  const maxNew = maxNewArg ? Number(maxNewArg.split('=')[1]) : DEFAULT_MAX_NEW;

  if (!csvPath) {
    console.error('Kullanım: node scripts/sync-stocks.mjs <hisseler.csv> [--apply]');
    process.exit(1);
  }

  const { stocks: listed, invalid } = parseStockCsv(readFileSync(csvPath, 'utf8'));
  if (listed.size === 0) {
    console.error('CSV içinde geçerli satır bulunamadı.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    // ticker tüm tabloda unique; kripto/diğer tiplerle çakışmaları da görelim
    const existing = await prisma.stock.findMany({
      select: { ticker: true, companyName: true, stockType: true },
    });
    const existingTickers = new Set(existing.map(s => s.ticker));
    const existingStocks = existing.filter(s => s.stockType === 'stock');

    const toCreate = [...listed].filter(([ticker]) => !existingTickers.has(ticker));
    const conflicts = existing.filter(s => s.stockType !== 'stock' && listed.has(s.ticker));
    const notInList = existingStocks.filter(s => !listed.has(s.ticker)).map(s => s.ticker);

    console.log(`CSV: ${listed.size} hisse, DB: ${existingStocks.length} hisse`);
    console.log(`Eklenecek (${toCreate.length}): ${toCreate.map(([t]) => t).join(', ') || '-'}`);
    console.log(
      `DB'de olup listede olmayan (${notInList.length}, dokunulmadı): ${notInList.join(', ') || '-'}`
    );
    if (conflicts.length) {
      console.log(
        `Başka tiple çakışan (atlandı): ${conflicts.map(s => `${s.ticker} (${s.stockType})`).join(', ')}`
      );
    }
    if (invalid.length) console.log(`Atlanan satırlar:\n  ${invalid.join('\n  ')}`);

    if (!apply) {
      console.log('\nDry-run. Yazmak için --apply ekle.');
      return;
    }
    if (toCreate.length > maxNew) {
      throw new Error(
        `${toCreate.length} yeni hisse, limit ${maxNew}. Listeyi kontrol et; doğruysa --max-new=${toCreate.length} ile çalıştır.`
      );
    }

    const { count } = await prisma.stock.createMany({
      data: toCreate.map(([ticker, companyName]) => ({ ticker, companyName, stockType: 'stock' })),
      skipDuplicates: true,
    });

    console.log(`\n${count} hisse eklendi.`);
  } finally {
    await prisma.$disconnect();
  }
};

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
