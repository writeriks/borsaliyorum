/**
 * BIST hisse listesini Stock tablosuna ekler ve src/tickers.ts'i yeniden üretir.
 *
 * Girdi: her satırı "KOD;ŞİRKET ADI" (ya da virgül/tab ile ayrılmış) olan bir CSV.
 * Liste KAP'ın BIST şirketler sayfasından alınır; fiyat verisi içermez.
 *
 *   node scripts/sync-stocks.mjs hisseler.csv            # dry-run: sadece rapor
 *   node scripts/sync-stocks.mjs hisseler.csv --apply    # DB'ye yazar + tickers.ts günceller
 *
 * Mevcut hisseler silinmez ve adları değişmez (gönderiler bu kayıtlara bağlı);
 * listede olmayanlar sadece raporlanır.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

const TICKER_RE = /^[A-Z0-9]{3,6}$/;
const TICKERS_FILE = new URL('../src/tickers.ts', import.meta.url);

export const parseStockCsv = text => {
  const stocks = new Map();
  const invalid = [];

  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.trim();
    if (!line) return;

    const [rawTicker, ...rest] = line.split(/[;,\t]/);
    // Kodlar büyük harf gelir; "Kod" gibi başlık satırları böylece elenir
    const ticker = rawTicker.trim().replace(/^"|"$/g, '');
    const companyName = rest.join(' ').trim().replace(/^"|"$/g, '').replace(/\s+/g, ' ');

    if (!TICKER_RE.test(ticker) || !companyName) {
      // Başlık satırı ya da bozuk satır
      if (i > 0) invalid.push(`${i + 1}: ${line}`);
      return;
    }
    if (!stocks.has(ticker)) stocks.set(ticker, companyName);
  });

  return { stocks, invalid };
};

export const renderTickersFile = stocks => {
  const entries = [...stocks]
    .sort(([a], [b]) => a.localeCompare(b, 'tr'))
    .map(
      ([ticker, name]) =>
        `  {\n    'id': '${ticker}',\n    'display': '${`${ticker} ${name}`.replace(/'/g, "\\'")}',\n  },`
    )
    .join('\n');

  return `import { SuggestionDataItem } from 'react-mentions';\n\nexport const tickers: SuggestionDataItem[] = [\n${entries}\n];\n`;
};

const main = async () => {
  const [csvPath] = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  const apply = process.argv.includes('--apply');

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
    const existing = await prisma.stock.findMany({
      where: { stockType: 'stock' },
      select: { ticker: true, companyName: true },
    });
    const existingTickers = new Set(existing.map(s => s.ticker));

    const toCreate = [...listed].filter(([ticker]) => !existingTickers.has(ticker));
    const notInList = existing.filter(s => !listed.has(s.ticker)).map(s => s.ticker);

    console.log(`CSV: ${listed.size} hisse, DB: ${existing.length} hisse`);
    console.log(`Eklenecek (${toCreate.length}): ${toCreate.map(([t]) => t).join(', ') || '-'}`);
    console.log(`DB'de olup listede olmayan (${notInList.length}, dokunulmadı): ${notInList.join(', ') || '-'}`);
    if (invalid.length) console.log(`Atlanan satırlar:\n  ${invalid.join('\n  ')}`);

    if (!apply) {
      console.log('\nDry-run. Yazmak için --apply ekle.');
      return;
    }

    const { count } = await prisma.stock.createMany({
      data: toCreate.map(([ticker, companyName]) => ({ ticker, companyName, stockType: 'stock' })),
      skipDuplicates: true,
    });

    // Otomatik tamamlama listesi DB'deki tüm hisseleri içersin
    const all = await prisma.stock.findMany({
      where: { stockType: 'stock' },
      select: { ticker: true, companyName: true },
    });
    writeFileSync(TICKERS_FILE, renderTickersFile(all.map(s => [s.ticker, s.companyName])));

    console.log(`\n${count} hisse eklendi. src/tickers.ts güncellendi (${all.length} hisse).`);
  } finally {
    await prisma.$disconnect();
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
