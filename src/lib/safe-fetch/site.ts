import { getDomain } from 'tldts';

import { ipLiteralOf } from './ip-policy';

/**
 * Host'un kayıtlı alan adı (eTLD+1, Public Suffix List'e göre). `haber.ornek.com.tr` →
 * `ornek.com.tr`. PSL'nin "private" bölümü de sayılır: `a.github.io` ile `b.github.io` farklı
 * sitelerdir (farklı sahipler). IP literal ya da PSL'de karşılığı olmayan ad kendisi döner.
 */
export const registrableDomainOf = (hostname: string): string => {
  const literal = ipLiteralOf(hostname);
  if (literal !== null) return literal;
  const host = hostname.replace(/\.+$/, '').toLowerCase();
  return getDomain(host, { allowPrivateDomains: true }) ?? host;
};

/** İki host aynı kayıtlı alan adına mı ait? */
export const isSameSite = (a: string, b: string): boolean =>
  registrableDomainOf(a) === registrableDomainOf(b);
