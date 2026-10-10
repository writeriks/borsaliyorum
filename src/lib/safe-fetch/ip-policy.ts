import { isIP } from 'node:net';

import ipaddr from 'ipaddr.js';

/**
 * Hedef adres politikası (ADR-0002 Karar 6). Yaklaşım izin listesidir: yalnızca genel
 * yönlendirilebilir unicast adresler kabul edilir; bilinmeyen/yeni özel aralıklar da reddedilir.
 */

// IPv6 genel unicast bloğu (2000::/3). `::a.b.c.d` (IPv4-compatible), `100::/64` gibi
// ipaddr.js'in 'unicast' saydığı ama internette olmayan adresler bu sayede dışarıda kalır.
const IPV6_GLOBAL_UNICAST = ipaddr.IPv6.parseCIDR('2000::/3');

/** `ip` genel internette yönlendirilebilir bir unicast adres mi? Geçersiz girdi → false. */
export const isPublicAddress = (ip: string): boolean => {
  if (isIP(ip) === 0) return false;
  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    addr = ipaddr.parse(ip);
  } catch {
    // isIP geçtiyse parse edilebilir olmalı; olamazsa güvenli taraf: reddet.
    return false;
  }
  if (addr.kind() === 'ipv6') {
    const v6 = addr as ipaddr.IPv6;
    // ::ffff:127.0.0.1 → 127.0.0.1 kurallarıyla değerlendirilir (hiçbir zaman genel kabul edilmez:
    // DNS'in IPv4-mapped döndürmesi zaten anormaldir).
    if (v6.isIPv4MappedAddress()) return false;
    return v6.range() === 'unicast' && v6.match(IPV6_GLOBAL_UNICAST);
  }
  return addr.range() === 'unicast';
};

// Genel DNS'te anlamı olmayan, iç ağa çözülmesi beklenen son ekler (RFC 6761/6762/8375 ve
// bulut metadata adları). DNS sonucu ne olursa olsun reddedilir.
const BLOCKED_SUFFIXES = [
  '.localhost',
  '.local',
  '.localdomain',
  '.internal',
  '.home.arpa',
  '.lan',
];
const BLOCKED_HOSTS = new Set(['localhost', 'localhost.localdomain', 'metadata']);

/**
 * IP olmayan host adı için ad tabanlı ön kontrol. `hostname` WHATWG `URL.hostname` biçimindedir
 * (küçük harf, punycode). Tek etiketli adlar (`intranet`) arama son eki ile iç ağa gider.
 */
export const isBlockedHostname = (hostname: string): boolean => {
  const host = hostname.replace(/\.$/, '');
  if (host === '' || BLOCKED_HOSTS.has(host)) return true;
  if (!host.includes('.')) return true;
  return BLOCKED_SUFFIXES.some(suffix => host.endsWith(suffix));
};

/** `URL.hostname` IP literal ise köşeli parantezsiz adresi, değilse null döner. */
export const ipLiteralOf = (hostname: string): string | null => {
  const bare =
    hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  return isIP(bare) === 0 ? null : bare;
};
