import 'server-only';

import { redirect as redirectRaw } from 'next/navigation';
import { getLocale } from 'next-intl/server';

import { redirect } from '@/i18n/navigation';

import { safeNextPath } from './rules';

/**
 * Girişten/onboarding'den sonra `next`'e (yoksa akışa) sunucu yönlendirmesi. `next` ham yoldur
 * (yerel öneki dahil, `safeNextPath`): next-intl'in `redirect`'i öneki ikinci kez eklerdi
 * (`/en/en/akis` → 404). Bu yüzden `next/navigation` ile; akış ise yerele göre.
 */
export const redirectToNext = async (next: string | null): Promise<never> => {
  const safe = safeNextPath(next);
  if (safe) return redirectRaw(safe);
  return redirect({ href: '/akis', locale: await getLocale() });
};
