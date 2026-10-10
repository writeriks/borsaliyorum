/**
 * Loglara kişisel veri ve gizli değer girmesin diye kullanılan maskeleme yardımcıları
 * (KVKK: veri minimizasyonu). Saf fonksiyonlardır; logger dışında da (ör. hata raporları)
 * kullanılabilir.
 */

export const REDACTED = '[REDACTED]';

const EMAIL_RE = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

// `scheme://kullanıcı:parola@host` → kullanıcı adı da kişiyi/rolü ele verdiği için tamamı gizlenir.
// Açgözlü eşleşme, parolada kodlanmamış `@` olsa bile authority'nin son `@`'ına kadar alır.
const URL_CREDENTIALS_RE = /\b([a-z][a-z0-9+.-]*:\/\/)[^\s/?#]+@/gi;
// `?token=…`, `&oobCode=…`, `#access_token=…`, `&api_key=…` gibi parametrelerin değeri
const URL_SECRET_PARAM_RE =
  /([?&#;](?:[\w-]*[_-])?(?:token|code|oobcode|key|apikey|secret|password|passwd)=)[^&#;\s"']*/gi;
const AUTH_SCHEME_RE = /\b(Bearer|Basic)\s+[^\s"',;]+/gi;

// Sıra önemli: e-posta kontrolünden önce gelir ki `emailVerificationToken` açık yazılmasın.
// `auth(?!or)`: `authorId`/`author` gizlenmesin, `authToken`/`oauth` gizlensin.
const SECRET_KEY_RE =
  /pass(word|wd)?|pwd|secret|token|authorization|auth(?!or)|jwt|bearer|cookie|session|private.?key|api.?key|credential|oob.?code/i;
// Tamamen gizlenen kişisel veri (kısmi maskeleme kişiyi yine tekilleştirir)
const PII_KEY_RE = /phone|gsm|msisdn|tckn|tc.?kimlik|national.?id/i;
const EMAIL_KEY_RE = /e-?mail/i;
// `ip$` büyük/küçük harf duyarlı: `userIp`, `clientIP`, `client_ip`, `x-real-ip` evet;
// `membership`, `relationship` hayır.
const IP_KEY_RES: readonly RegExp[] = [
  /^ip(v[46])?$/i,
  /(Ip|IP|[_.-]ip)(v[46])?$/,
  /ip.?addr(ess)?/i,
  /remote.?addr(ess)?/i,
  /forwarded/i,
];

/** `ali.veli@example.com` → `a***@example.com`; metin içindeki tüm adresler maskelenir. */
export const maskEmails = (text: string): string => text.replace(EMAIL_RE, '$1***@$2');

/**
 * Serbest metindeki gizli değerleri maskeler: bağlantı URL'lerindeki kullanıcı adı/parola,
 * URL'deki token/kod/anahtar parametreleri, `Bearer`/`Basic` kimlik bilgileri ve e-postalar.
 * İdempotenttir.
 */
export const maskText = (text: string): string =>
  maskEmails(
    text
      .replace(URL_CREDENTIALS_RE, `$1${REDACTED}@`)
      .replace(URL_SECRET_PARAM_RE, `$1${REDACTED}`)
      .replace(AUTH_SCHEME_RE, `$1 ${REDACTED}`)
  );

/**
 * IPv4'te son okteti, IPv6'da ilk üç grup dışındakileri sıfırlar (ağ bilgisi kalır, kişi
 * tekilleşmez). `x-forwarded-for` gibi virgüllü listelerde her adres ayrı maskelenir.
 */
export const maskIp = (value: string): string =>
  value
    .split(',')
    .map(part => {
      const ip = part.trim();
      const v4 = IPV4_RE.exec(ip);
      if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0`;
      if (ip.includes(':')) {
        const groups = ip.split('::')[0]?.split(':').filter(Boolean) ?? [];
        return `${groups.slice(0, 3).join(':')}::`;
      }
      return REDACTED;
    })
    .join(', ');

type KeyKind = 'secret' | 'email' | 'ip' | 'plain';

export const classifyKey = (key: string): KeyKind => {
  if (SECRET_KEY_RE.test(key) || PII_KEY_RE.test(key)) return 'secret';
  if (IP_KEY_RES.some(re => re.test(key))) return 'ip';
  if (EMAIL_KEY_RE.test(key)) return 'email';
  return 'plain';
};
