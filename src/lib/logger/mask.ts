/**
 * Loglara kişisel veri girmesin diye kullanılan maskeleme yardımcıları (KVKK: veri minimizasyonu).
 * Saf fonksiyonlardır; logger dışında da (ör. hata raporları) kullanılabilir.
 */

const EMAIL_RE = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

const SECRET_KEY_RE =
  /pass(word)?|secret|token|authorization|cookie|session|private.?key|api.?key|credential/i;
const EMAIL_KEY_RE = /e-?mail/i;
const IP_KEY_RE = /^(ip|ip.?address|client.?ip|remote.?addr(ess)?|x-forwarded-for|x-real-ip)$/i;

export const REDACTED = '[REDACTED]';

/** `ali.veli@example.com` → `a***@example.com`; metin içindeki tüm adresler maskelenir. */
export const maskEmails = (text: string): string => text.replace(EMAIL_RE, '$1***@$2');

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
  if (IP_KEY_RE.test(key)) return 'ip';
  if (EMAIL_KEY_RE.test(key)) return 'email';
  if (SECRET_KEY_RE.test(key)) return 'secret';
  return 'plain';
};
