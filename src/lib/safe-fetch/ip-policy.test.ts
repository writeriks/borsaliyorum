import { describe, expect, it } from 'vitest';

import { ipLiteralOf, isBlockedHostname, isPublicAddress } from './ip-policy';

describe('isPublicAddress', () => {
  it.each([
    // IPv4 özel/rezerve aralıklar
    '0.0.0.0',
    '0.1.2.3',
    '10.0.0.1',
    '100.64.0.1',
    '100.127.255.254',
    '127.0.0.1',
    '127.255.255.254',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.0.0.1',
    '192.0.2.1',
    '192.88.99.1',
    '192.168.1.1',
    '198.18.0.1',
    '198.51.100.1',
    '203.0.113.7',
    '224.0.0.1',
    '239.255.255.250',
    '240.0.0.1',
    '255.255.255.255',
    // IPv6
    '::',
    '::1',
    'fc00::1',
    'fd00::1',
    'fe80::1',
    'fec0::1',
    'ff02::1',
    '::ffff:127.0.0.1',
    '::ffff:8.8.8.8',
    '::127.0.0.1',
    '64:ff9b::7f00:1',
    '2002:7f00:1::',
    '2001::1',
    '2001:db8::1',
    '100::1',
    // Geçersiz girdi
    'localhost',
    '',
    '127.1',
    '999.1.1.1',
  ])('%s → false', ip => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '93.184.216.34',
    '172.32.0.1',
    '2606:4700:4700::1111',
    '2a00:1450::1',
  ])('%s → true', ip => {
    expect(isPublicAddress(ip)).toBe(true);
  });
});

describe('isBlockedHostname', () => {
  it.each([
    'localhost',
    'localhost.',
    'LOCALHOST'.toLowerCase(),
    'api.localhost',
    'localhost.localdomain',
    'metadata.google.internal',
    'printer.local',
    'router.home.arpa',
    'nas.lan',
    'intranet',
    '',
  ])('%s engellenir', host => {
    expect(isBlockedHostname(host)).toBe(true);
  });

  it.each(['kap.org.tr', 'www.borsaistanbul.com', '127.0.0.1.nip.io', 'xn--bcher-kva.example'])(
    '%s ad kuralına takılmaz (DNS kontrolü ayrıca yapılır)',
    host => {
      expect(isBlockedHostname(host)).toBe(false);
    }
  );
});

describe('ipLiteralOf', () => {
  it('URL.hostname biçimindeki IP literal’leri tanır', () => {
    expect(ipLiteralOf('127.0.0.1')).toBe('127.0.0.1');
    expect(ipLiteralOf('[::1]')).toBe('::1');
    expect(ipLiteralOf('[::ffff:7f00:1]')).toBe('::ffff:7f00:1');
    expect(ipLiteralOf('kap.org.tr')).toBeNull();
  });
});
