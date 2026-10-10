/**
 * Kullanıcının seçemeyeceği kullanıcı adları (auth-session "Kayıt kuralları": admin,
 * borsaliyorum, spk…). Kural `^[a-z0-9_]{3,20}$` olduğu için yalnızca bu biçimdeki adlar
 * listelenir; karşılaştırma küçük harfle ve tam eşleşmeyle yapılır.
 *
 * Kapsam: platformu/yetkiliyi/resmî kurumu taklit edebilecek adlar ve uygulama yolları.
 * `20261010120600_m1_user_onboarded_backfill` migration'ı aynı listeyi taşır (eski hesaplardan
 * bu adlara sahip olanlar onboarding'de yeni ad seçer); `tests/unit/reserved-usernames.test.ts`
 * ikisinin aynı olduğunu doğrular. Liste büyüyebilir; migration uygulandıktan sonra eklenen ad
 * yalnızca yeni kayıtları etkiler.
 */
export const RESERVED_USERNAMES = [
  // Platform ve ekip
  'admin',
  'administrator',
  'root',
  'system',
  'sistem',
  'moderator',
  'mod',
  'staff',
  'ekip',
  'team',
  'support',
  'destek',
  'help',
  'yardim',
  'official',
  'resmi',
  'security',
  'guvenlik',
  'legal',
  'hukuk',
  'kvkk',
  'iletisim',
  'contact',
  'info',
  'bilgi',
  'noreply',
  'no_reply',
  'borsaliyorum',
  'borsaliyorumcom',
  'borsaliyorum_tr',
  // Resmî kurumlar ve piyasa (taklit / yanıltma riski)
  'spk',
  'kap',
  'bist',
  'borsaistanbul',
  'borsa_istanbul',
  'tcmb',
  'merkezbankasi',
  'masak',
  'btk',
  'bddk',
  'mkk',
  'takasbank',
  // Uygulama yolları ve teknik adlar (K7 Türkçe URL'ler)
  'api',
  'www',
  'mail',
  'akis',
  'kesfet',
  'bildirimler',
  'profil',
  'ayarlar',
  'settings',
  'giris',
  'kayit',
  'cikis',
  'login',
  'logout',
  'signup',
  'register',
  'gonderi',
  'hisse',
  'etiket',
  'arama',
  'search',
  'null',
  'undefined',
  'anonymous',
  'anonim',
] as const;

const RESERVED = new Set<string>(RESERVED_USERNAMES);

export const isReservedUsername = (username: string): boolean =>
  RESERVED.has(username.toLowerCase());
