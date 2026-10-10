import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import type { ShellViewer } from '@/components/shell/types';
import { parseDevComposerParams } from '@/features/composer/components/dev-composer-params';
import { DevComposerPreview } from '@/features/composer/components/dev-composer-preview';
import { routing } from '@/i18n/routing';
import { getCurrentUser } from '@/lib/auth/session';
import type { SessionUser } from '@/lib/auth/types';
import { devPagesEnabled } from '@/lib/env.dev-pages';

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Kapı istek anında okunur; build'e gömülü statik sayfa olmasın
export const dynamic = 'force-dynamic';

const sessionShellViewer = (user: SessionUser | null): ShellViewer =>
  user
    ? {
        status: 'authenticated',
        user: { username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
      }
    : { status: 'anonymous' };

type DevComposerPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Geçici composer önizlemesi (S8). S11/S12 composer'ı gerçek sayfalara bağlayınca silinir.
 * Yalnızca geliştirme ve E2E build'inde açık; Vercel production'da her zaman 404.
 */
const DevComposerPage = async ({
  params,
  searchParams,
}: DevComposerPageProps): Promise<ReactElement> => {
  if (!devPagesEnabled()) notFound();
  const { locale: raw } = await params;
  const locale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  setRequestLocale(locale);
  const config = parseDevComposerParams(await searchParams);
  // Kabuk her zaman gerçek oturumu gösterir (S5: AuthProvider kaynaklı). Composer `?auth=session`
  // ile aynı kullanıcıyı kullanır; diğer modlarda sahte kullanıcı (id 42)
  const user = await getCurrentUser();
  const preview = (
    <DevComposerPreview
      config={config}
      sessionUserId={config.auth === 'session' ? (user?.userId ?? null) : null}
    />
  );

  if (config.variant === 'sheet') return <main>{preview}</main>;
  return <AppShell viewer={sessionShellViewer(user)}>{preview}</AppShell>;
};

export default DevComposerPage;
