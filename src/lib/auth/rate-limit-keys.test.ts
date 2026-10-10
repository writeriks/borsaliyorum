import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { RATE_LIMIT_KEY_MAX_LENGTH } from '@/lib/rate-limit';

import {
  AUTH_RATE_LIMITS,
  type AuthRateLimitName,
  authRateLimitRule,
  hashRateLimitSubject,
  isIpRule,
} from './rate-limit-keys';

const SECRET = new Uint8Array(randomBytes(32));
const IP = '203.0.113.7';

describe('auth rate limit anahtarları', () => {
  it('IP anahtarında ham IP yok; HMAC özeti deterministik', () => {
    const rule = authRateLimitRule('session.ip', IP, SECRET);
    expect(rule.key).not.toContain(IP);
    expect(rule.key).not.toContain('203');
    expect(rule.key).toMatch(/^auth\.session\.ip:[A-Za-z0-9_-]{22}$/);
    expect(authRateLimitRule('session.ip', IP, SECRET).key).toBe(rule.key);
    expect(rule).toMatchObject(AUTH_RATE_LIMITS['session.ip']);
  });

  it('farklı IP / farklı gizli anahtar → farklı özet (anahtarsız hash ile eşleştirilemez)', () => {
    expect(hashRateLimitSubject(IP, SECRET)).not.toBe(hashRateLimitSubject('203.0.113.8', SECRET));
    expect(hashRateLimitSubject(IP, SECRET)).not.toBe(
      hashRateLimitSubject(IP, new Uint8Array(randomBytes(32)))
    );
  });

  it("128 karakterlik Firebase uid'si de sütun sınırına sığar ve açık tutulmaz", () => {
    const uid = 'u'.repeat(128);
    const names = Object.keys(AUTH_RATE_LIMITS) as AuthRateLimitName[];
    for (const name of names) {
      const { key } = authRateLimitRule(name, uid, SECRET);
      expect(key.length).toBeLessThanOrEqual(RATE_LIMIT_KEY_MAX_LENGTH);
      expect(key).not.toContain(uid);
    }
  });

  it('IP bilinmiyorsa ortak kova (limit yine uygulanır)', () => {
    expect(authRateLimitRule('session.ip', null, SECRET).key).toBe('auth.session.ip:unknown');
  });

  it('IP kuralları retention desenine (auth.%.ip:%) uyar, uid kuralları uymaz', () => {
    const like = /^auth\..*\.ip:.*$/;
    for (const name of Object.keys(AUTH_RATE_LIMITS) as AuthRateLimitName[]) {
      expect(like.test(authRateLimitRule(name, 'x', SECRET).key)).toBe(isIpRule(name));
    }
  });
});
