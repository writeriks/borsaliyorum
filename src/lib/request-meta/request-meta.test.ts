import { describe, expect, it } from 'vitest';

import { readRequestMeta } from './index';

describe('readRequestMeta', () => {
  it("x-real-ip'i tercih eder", () => {
    const meta = readRequestMeta(
      new Headers({ 'x-real-ip': '198.51.100.4', 'x-forwarded-for': '203.0.113.9' })
    );
    expect(meta.ip).toBe('198.51.100.4');
    expect(meta.port).toBeNull();
  });

  it("x-forwarded-for'un ilk adresini kullanır; IPv6 ve port ekli biçimleri çözer", () => {
    expect(readRequestMeta(new Headers({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' })).ip).toBe(
      '203.0.113.9'
    );
    expect(readRequestMeta(new Headers({ 'x-forwarded-for': '2001:db8::1' })).ip).toBe(
      '2001:db8::1'
    );
    expect(readRequestMeta(new Headers({ 'x-forwarded-for': '[2001:db8::1]:443' })).ip).toBe(
      '2001:db8::1'
    );
    expect(readRequestMeta(new Headers({ 'x-forwarded-for': '203.0.113.9:5555' })).ip).toBe(
      '203.0.113.9'
    );
  });

  it('IP olmayan değer kabul edilmez', () => {
    expect(readRequestMeta(new Headers({ 'x-real-ip': 'not-an-ip' })).ip).toBeNull();
    expect(readRequestMeta(new Headers()).ip).toBeNull();
  });

  it('requestId: geçerli gelen kimlik korunur, yoksa üretilir', () => {
    expect(readRequestMeta(new Headers({ 'x-vercel-id': 'fra1::abc-123' })).requestId).toBe(
      'fra1::abc-123'
    );
    const generated = readRequestMeta(new Headers({ 'x-request-id': '<script>' })).requestId;
    expect(generated).toMatch(/^[0-9a-f-]{36}$/);
  });
});
