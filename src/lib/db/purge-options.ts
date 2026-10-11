/**
 * `scripts/purge-retention.ts` argümanları ve çıkış kodu (saf; testli). Gerçek silme yalnızca
 * açık `--execute` ile; varsayılan dry-run (zamanlanmış koşu dahil). Firebase yetim hesap
 * silmesi ayrıca `ORPHAN_PURGE_ENABLED=true` ister (iki anahtar: biri workflow'da, biri
 * onay gerektiren GitHub environment'ında).
 */
import { DEFAULT_CONTENT_EVENT_RETENTION } from './retention';

export type PurgeStep = 'db' | 'firebase';

export type PurgeOptions = {
  readonly execute: boolean;
  readonly steps: readonly PurgeStep[];
  readonly contentEventRetention: string;
  /** Firebase hesapları gerçekten silinir mi (`--execute` + `ORPHAN_PURGE_ENABLED=true`)? */
  readonly firebaseDelete: boolean;
};

const EXECUTE = '--execute';
const ONLY = '--only=';
const RETENTION = '--content-event-retention=';
const ALL_STEPS: readonly PurgeStep[] = ['db', 'firebase'];

const isStep = (value: string): value is PurgeStep => (ALL_STEPS as string[]).includes(value);

export const resolvePurgeOptions = (
  argv: readonly string[],
  env: Readonly<Record<string, string | undefined>>
): PurgeOptions => {
  let execute = false;
  let steps: readonly PurgeStep[] = ALL_STEPS;
  let contentEventRetention = DEFAULT_CONTENT_EVENT_RETENTION;

  for (const arg of argv) {
    if (arg === EXECUTE) {
      execute = true;
    } else if (arg.startsWith(ONLY)) {
      const step = arg.slice(ONLY.length);
      if (!isStep(step)) throw new Error(`--only yalnızca db ya da firebase olabilir: ${step}`);
      steps = [step];
    } else if (arg.startsWith(RETENTION)) {
      contentEventRetention = arg.slice(RETENTION.length);
    } else {
      throw new Error(`Bilinmeyen argüman: ${arg}`);
    }
  }

  return {
    execute,
    steps,
    contentEventRetention,
    firebaseDelete: execute && env.ORPHAN_PURGE_ENABLED?.trim() === 'true',
  };
};

export type FirebaseStepResult =
  { readonly skipped: true } | { readonly aborted: string } | { readonly failed: number };

/** Firebase silme hatası ya da fren → 1 (GitHub Actions koşusu kırmızı görünür). */
export const purgeExitCode = (result: { firebase?: FirebaseStepResult }): 0 | 1 => {
  const firebase = result.firebase;
  if (!firebase) return 0;
  if ('aborted' in firebase) return 1;
  if ('failed' in firebase && firebase.failed > 0) return 1;
  return 0;
};
