/**
 * KAP'tan Yıldız, Ana, Alt ve Yakın İzleme pazarlarında işlem gören şirketleri çeker ve
 * "KOD;ŞİRKET ADI" CSV'si olarak stdout'a yazar. Bono/varant ihraççıları ve fonlar alınmaz.
 * Sadece kamuya açık kod ve unvan alınır; fiyat verisi alınmaz.
 *
 *   node scripts/fetch-kap-stocks.mjs > hisseler.csv
 *   node scripts/fetch-kap-stocks.mjs --file sayfa.html > hisseler.csv   # kayıtlı sayfadan
 */
import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Pazarlar sayfası seçilen pazardan bağımsız olarak tüm pazarların listesini gömülü taşır
const KAP_URL = `https://www.kap.org.tr/tr/Pazarlar?market=${Buffer.from('YILDIZ PAZAR').toString('base64')}`;
const EQUITY_GROUP = 'PAY PİYASASI';
// Pay piyasasındaki diğer pazarlar (POİP, varant, emtia, girişim sermayesi fonları) hisse değil
const EQUITY_MARKETS = new Set(['YILDIZ PAZAR', 'ANA PAZAR', 'ALT PAZAR', 'YAKIN İZLEME PAZARI']);
const TICKER_RE = /^[A-Z0-9]{3,6}$/;

// Next.js sayfası veriyi self.__next_f.push([1,"..."]) içindeki JS string'lerinde taşır
const extractRscPayload = html =>
  [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)]
    .map(([, literal]) => JSON.parse(literal))
    .join('');

const readJsonArrayAt = (text, start) => {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (char === '\\') i += 1;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error('KAP pazar verisi eksik ya da bozuk.');
};

export const parseKapMarkets = html => {
  const payload = extractRscPayload(html);
  const marker = `"data":[{"title":"${EQUITY_GROUP}"`;
  const index = payload.indexOf(marker);
  if (index === -1)
    throw new Error('KAP sayfasında pazar verisi bulunamadı; sayfa yapısı değişmiş olabilir.');

  const groups = readJsonArrayAt(payload, index + '"data":'.length);
  const stocks = new Map();

  groups
    .filter(group => group.title === EQUITY_GROUP)
    .flatMap(group => group.contents)
    .filter(market => EQUITY_MARKETS.has(market.marketName))
    .forEach(market =>
      market.marketDetailContentList
        .filter(item => item.mkkMemberOid && !item.fundOid)
        .forEach(item =>
          item.stockCode
            .split(/[\s,]+/)
            .filter(code => TICKER_RE.test(code))
            .forEach(code => {
              if (!stocks.has(code))
                stocks.set(code, { name: item.title.trim(), market: market.marketName });
            })
        )
    );

  return stocks;
};

const main = async () => {
  const fileIndex = process.argv.indexOf('--file');
  const html =
    fileIndex > -1
      ? readFileSync(process.argv[fileIndex + 1], 'utf8')
      : await fetch(KAP_URL, {
          headers: { 'User-Agent': 'borsaliyorum-stock-sync' },
          signal: AbortSignal.timeout(60_000),
        }).then(res => {
          if (!res.ok) throw new Error(`KAP yanıtı ${res.status}`);
          return res.text();
        });

  const stocks = parseKapMarkets(html);
  // Sayfa yapısı değişirse yarım listeyle DB'ye yazmayalım
  if (stocks.size < 300) {
    throw new Error(
      `Beklenenden az hisse bulundu (${stocks.size}); KAP sayfa yapısı değişmiş olabilir.`
    );
  }

  process.stdout.write([...stocks].map(([code, { name }]) => `${code};${name}`).join('\n') + '\n');

  const perMarket = {};
  stocks.forEach(({ market }) => {
    perMarket[market] = (perMarket[market] ?? 0) + 1;
  });
  console.error(`${stocks.size} hisse bulundu:`, perMarket);
};

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch(error => {
    console.error(error.message);
    process.exit(1);
  });
}
