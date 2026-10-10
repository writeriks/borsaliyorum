import { describe, expect, it } from 'vitest';

import { initialsOf } from './initials';

describe('initialsOf', () => {
  it('Türkçe büyük harf kuralını uygular', () => {
    expect(initialsOf('ilker şahin')).toBe('İŞ');
    expect(initialsOf('  ayşe  ')).toBe('A');
    expect(initialsOf('ıhlamur ağacı yolu')).toBe('IA');
  });
});
