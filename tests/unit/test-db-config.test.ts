import { describe, expect, it } from 'vitest';

import {
  createRunId,
  isStaleRun,
  runOwnerPid,
  runPrefix,
  templateDatabaseName,
  workerDatabaseNameFor,
} from '@tests/db/config';

describe('test database naming (parallel runs)', () => {
  it('gives every run its own prefix', () => {
    const a = createRunId(1234);
    const b = createRunId(1234);

    expect(a).not.toBe(b);
    expect(runPrefix(a)).toMatch(/^bt_r1234_[0-9a-f]{6}_$/);
    expect(templateDatabaseName(a).startsWith(runPrefix(a))).toBe(true);
    expect(workerDatabaseNameFor(a, '3')).toBe(`${runPrefix(a)}w3`);
    // Bir koşunun teardown öneki diğerinin DB'lerini kapsamaz
    expect(workerDatabaseNameFor(b, '3').startsWith(runPrefix(a))).toBe(false);
  });

  it('keeps names within the Postgres identifier limit', () => {
    const name = `${workerDatabaseNameFor(createRunId(4_194_304), '64')}_backfill`;
    expect(name.length).toBeLessThanOrEqual(63);
    expect(name).toMatch(/^[a-z0-9_]+$/);
  });

  it('rejects malformed run ids and pool ids', () => {
    expect(() => runPrefix('x; DROP')).toThrow();
    expect(() => workerDatabaseNameFor(createRunId(), '1;')).toThrow();
  });

  it('treats only databases of dead runs as stale', () => {
    const dead = `${runPrefix(createRunId(999_999))}w1`;
    const alive = `${runPrefix(createRunId(111))}tpl`;
    const own = `${runPrefix(createRunId())}tpl`;
    const isAlive = (pid: number): boolean => pid === 111;

    expect(runOwnerPid(dead)).toBe(999_999);
    expect(isStaleRun(dead, isAlive)).toBe(true);
    expect(isStaleRun(alive, isAlive)).toBe(false);
    expect(isStaleRun(own, () => false)).toBe(false);
    // Eski biçim / yabancı DB'lere dokunulmaz
    expect(isStaleRun('bt_template', () => false)).toBe(false);
    expect(isStaleRun('bt_w1', () => false)).toBe(false);
  });
});
