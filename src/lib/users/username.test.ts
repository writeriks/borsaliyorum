import { describe, expect, it } from 'vitest';

import { normalizeUsernameInput, usernameIssue, usernameSchema } from './username';

describe('kullanıcı adı kuralı ^[a-z0-9_]{3,20}$ + rezerve liste', () => {
  it.each(['ayse_k', 'abc', 'a1b2c3', 'x'.repeat(20), 'yatirimci_42'])('geçerli: %s', name => {
    expect(usernameIssue(name)).toBeNull();
    expect(usernameSchema.safeParse(name).success).toBe(true);
  });

  it.each([
    ['ab', 'tooShort'],
    ['x'.repeat(21), 'tooLong'],
    ['ayşe', 'invalidChars'],
    ['ayse.k', 'invalidChars'],
    ['ayse-k', 'invalidChars'],
    ['ayse k', 'invalidChars'],
    ['ayse@example.com', 'invalidChars'],
    ['ayse.kaya@example.com', 'tooLong'],
    ['a@b.co', 'invalidChars'],
    ['admin', 'reserved'],
    ['borsaliyorum', 'reserved'],
    ['spk', 'reserved'],
    ['akis', 'reserved'],
  ])('reddeder: %s → %s', (name, issue) => {
    expect(usernameIssue(name)).toBe(issue);
    const result = usernameSchema.safeParse(name);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(issue);
  });

  it('baştaki/sondaki boşluğu ve ASCII büyük harfi normalize eder', () => {
    expect(normalizeUsernameInput('  Ayse_K ')).toBe('ayse_k');
    expect(usernameSchema.parse(' Yatirimci ')).toBe('yatirimci');
  });

  it('Türkçe büyük İ normalize edilince de kurala uymaz (ı/İ belirsizliği yok)', () => {
    expect(usernameSchema.safeParse('İSTANBUL').success).toBe(false);
  });

  it('rezerve ad büyük harfle de reddedilir', () => {
    expect(usernameSchema.safeParse('ADMIN').success).toBe(false);
  });
});
