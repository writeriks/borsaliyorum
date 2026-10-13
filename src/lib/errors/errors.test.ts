import { describe, expect, it, vi } from 'vitest';

import type { Logger } from '@/lib/logger';

import {
  AppError,
  ERROR_CODES,
  ErrorCode,
  errorMessageKey,
  fail,
  isErrorCode,
  ok,
  type Result,
  toFailure,
} from './index';

const fakeLogger = (): Logger & { error: ReturnType<typeof vi.fn> } => {
  const log = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(),
  };
  log.child.mockReturnValue(log);
  return log;
};

describe('Result yardımcıları', () => {
  it('ok ve fail ayırt edilebilir birleşim üretir', () => {
    const results: Result<number>[] = [ok(1), fail(ErrorCode.NOT_FOUND)];
    expect(results).toEqual([
      { ok: true, data: 1 },
      { ok: false, error: 'NOT_FOUND' },
    ]);
  });

  it('meta yalnızca verildiğinde eklenir', () => {
    expect(fail(ErrorCode.RATE_LIMITED, { retryAfter: 30 })).toEqual({
      ok: false,
      error: 'RATE_LIMITED',
      meta: { retryAfter: 30 },
    });
    expect('meta' in fail(ErrorCode.INTERNAL)).toBe(false);
  });
});

describe('isErrorCode', () => {
  it('yalnızca tanımlı kodları kabul eder', () => {
    expect(ERROR_CODES.every(isErrorCode)).toBe(true);
    expect(isErrorCode('NOPE')).toBe(false);
    expect(isErrorCode(undefined)).toBe(false);
  });
});

describe('toFailure', () => {
  it('AppError kodunu ve meta bilgisini korur, loglamaz', () => {
    const log = fakeLogger();
    const error = new AppError(ErrorCode.FORBIDDEN, { meta: { reason: 'owner' } });
    expect(toFailure(error, log)).toEqual({
      ok: false,
      error: 'FORBIDDEN',
      meta: { reason: 'owner' },
    });
    expect(log.error).not.toHaveBeenCalled();
  });

  it('beklenmeyen hatayı loglar ve dışarıya yalnızca INTERNAL verir', () => {
    const log = fakeLogger();
    const boom = new Error('connection string postgresql://secret@db leaked?');
    const failure = toFailure(boom, log);
    expect(failure).toEqual({ ok: false, error: 'INTERNAL' });
    expect(JSON.stringify(failure)).not.toContain('secret');
    expect(log.error).toHaveBeenCalledWith('unexpected error', { err: boom });
  });
});

describe('errorMessageKey', () => {
  it('errors namespace anahtarını üretir', () => {
    expect(errorMessageKey(ErrorCode.VALIDATION)).toBe('errors.VALIDATION');
  });
});
