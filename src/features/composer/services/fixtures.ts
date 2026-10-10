import type { StockIndexItem, TagSuggestion, UserSuggestion } from '../types';

/**
 * Tasarım spec'i §0 test fixture'ları. Geliştirme önizlemesi (`/dev/composer`) ve E2E
 * route mock'ları aynı veriyi kullanır. Kişiler sahte; e-posta alanı yok.
 */
export const FIXTURE_STOCKS: StockIndexItem[] = [
  { t: 'THYAO', n: 'Türk Hava Yolları A.O.', type: 'stock', m: 900 },
  { t: 'TUPRS', n: 'Tüpraş-Türkiye Petrol Rafinerileri A.Ş.', type: 'stock', m: 400 },
  { t: 'TTKOM', n: 'Türk Telekomünikasyon A.Ş.', type: 'stock', m: 300 },
  { t: 'ISCTR', n: 'Türkiye İş Bankası A.Ş. (C)', type: 'stock', m: 500 },
  { t: 'ISGYO', n: 'İş Gayrimenkul Yatırım Ortaklığı A.Ş.', type: 'stock', m: 50 },
  { t: 'SISE', n: 'Türkiye Şişe ve Cam Fabrikaları A.Ş.', type: 'stock', m: 350 },
  { t: 'ASELS', n: 'Aselsan Elektronik Sanayi ve Ticaret A.Ş.', type: 'stock', m: 800 },
  { t: 'BTC', n: 'Bitcoin', type: 'crypto', m: 200 },
];

/** Oturumdaki `aysegul`'un takip ettiği hisseler. */
export const FIXTURE_FOLLOWED_TICKERS = ['THYAO', 'ASELS'];

type FixtureUser = UserSuggestion & { blocksViewer?: boolean };

export const FIXTURE_USERS: FixtureUser[] = [
  { username: 'aysek', displayName: 'Ayşe Kaya', avatarUrl: null, following: true },
  { username: 'aysegul', displayName: 'Ayşegül Demir', avatarUrl: null, following: false },
  { username: 'mehmet_y', displayName: 'Mehmet Yılmaz', avatarUrl: null, following: false },
  {
    username: 'engelli',
    displayName: 'Engelli Hesap',
    avatarUrl: null,
    following: false,
    blocksViewer: true,
  },
];

export const FIXTURE_TAGS: TagSuggestion[] = [
  { slug: 'bist100', name: 'bist100', count: 12_345 },
  { slug: 'bilanco', name: 'bilanço', count: 2_100 },
  { slug: 'bist30', name: 'bist30', count: 800 },
  { slug: 'temettu', name: 'temettü', count: 640 },
];
