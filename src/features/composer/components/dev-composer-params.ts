/** `/dev/composer` sorgu parametreleri (yalnızca geliştirme önizlemesi ve E2E). */
export const DEV_VARIANTS = ['inline', 'dialog', 'sheet', 'comment'] as const;
export const DEV_OUTCOMES = [
  'ok',
  'internal',
  'network',
  'rateLimited',
  'unauthenticated',
  'restricted',
  'unknownCashtag',
] as const;
export const DEV_AUTH = ['authenticated', 'unknown', 'anonymous'] as const;

export type DevVariant = (typeof DEV_VARIANTS)[number];
export type DevOutcome = (typeof DEV_OUTCOMES)[number];

export type DevComposerConfig = {
  variant: DevVariant;
  /** `http`: S7/S9 uçlarına gerçek istek (E2E route mock'larıyla); `mock`: bellek içi. */
  services: 'mock' | 'http';
  outcome: DevOutcome;
  delayMs: number;
  postId: number;
  auth: (typeof DEV_AUTH)[number];
};

const pick = <T extends string>(
  allowed: readonly T[],
  value: string | string[] | undefined,
  fallback: T
): T => ((allowed as readonly string[]).includes(String(value)) ? (value as T) : fallback);

const toInt = (value: string | string[] | undefined, fallback: number, max: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= max ? parsed : fallback;
};

export const parseDevComposerParams = (
  params: Record<string, string | string[] | undefined>
): DevComposerConfig => ({
  variant: pick(DEV_VARIANTS, params.variant, 'inline'),
  services: params.services === 'http' ? 'http' : 'mock',
  outcome: pick(DEV_OUTCOMES, params.outcome, 'ok'),
  delayMs: toInt(params.delay, 300, 10_000),
  postId: toInt(params.postId, 1, 1_000_000) || 1,
  auth: pick(DEV_AUTH, params.auth, 'authenticated'),
});
