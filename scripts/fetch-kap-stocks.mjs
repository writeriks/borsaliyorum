/**
 * KAP'ın BIST şirketler listesini çeker ve "KOD;ŞİRKET ADI" CSV'si olarak stdout'a yazar.
 * Sadece kamuya açık şirket kodu ve unvanı alınır; fiyat verisi alınmaz.
 *
 *   node scripts/fetch-kap-stocks.mjs > hisseler.csv
 *   node scripts/fetch-kap-stocks.mjs --file sayfa.html > hisseler.csv   # kayıtlı sayfadan
 */
import { readFileSync } from 'node:fs';

const KAP_URL = 'https://www.kap.org.tr/tr/bist-sirketler';
const TICKER_RE = /^[A-Z0-9]{3,6}$/;

const decodeEntities = text =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const stripTags = html => decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

export const parseKapPage = html => {
  const stocks = new Map();

  for (const [row] of html.matchAll(/<tr[\s>][\s\S]*?<\/tr>/g)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(([, cell]) => cell);
    const nameCell = cells.find(cell => cell.includes('/sirket-bilgileri/ozet/'));
    if (!nameCell) continue;

    const companyName = stripTags(nameCell);
    // Bir şirketin birden fazla işlem kodu olabilir: "ISATR, ISBTR, ISCTR"
    const codes = stripTags(cells[0]).split(/[\s,]+/).filter(code => TICKER_RE.test(code));

    codes.forEach(code => {
      if (companyName && !stocks.has(code)) stocks.set(code, companyName);
    });
  }

  return stocks;
};

const main = async () => {
  const fileIndex = process.argv.indexOf('--file');
  const html =
    fileIndex > -1
      ? readFileSync(process.argv[fileIndex + 1], 'utf8')
      : await fetch(KAP_URL, { headers: { 'User-Agent': 'borsaliyorum-stock-sync' } }).then(res => {
          if (!res.ok) throw new Error(`KAP yanıtı ${res.status}`);
          return res.text();
        });

  const stocks = parseKapPage(html);
  // Sayfa yapısı değişirse yarım listeyle DB'ye yazmayalım
  if (stocks.size < 300) {
    throw new Error(`Beklenenden az hisse bulundu (${stocks.size}); KAP sayfa yapısı değişmiş olabilir.`);
  }

  process.stdout.write([...stocks].map(([code, name]) => `${code};${name}`).join('\n') + '\n');
  console.error(`${stocks.size} hisse bulundu.`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
