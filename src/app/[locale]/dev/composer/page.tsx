import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import type { ShellViewer } from '@/components/shell/types';
import {
  type DevComposerConfig,
  parseDevComposerParams,
} from '@/features/composer/components/dev-composer-params';
import { DevComposerPreview } from '@/features/composer/components/dev-composer-preview';
import { routing } from '@/i18n/routing';
import { devPagesEnabled } from '@/lib/env.dev-pages';

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Kapı istek anında okunur; build'e gömülü statik sayfa olmasın
export const dynamic = 'force-dynamic';

const DEV_SHELL_USER = { username: 'aysek', displayName: 'Ayşe Kaya', avatarUrl: null };

const shellViewerOf = (mode: DevComposerConfig['shell']): ShellViewer =>
  mode === 'authenticated' ? { status: 'authenticated', user: DEV_SHELL_USER } : { status: mode };

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

  if (config.variant === 'sheet') {
    return (
      <main>
        <DevComposerPreview config={config} />
      </main>
    );
  }
  return (
    // Kabuk varsayılan `unknown` (skeleton); `?shell=` ile sunucu tarafı kabuk durumları denenir
    <AppShell viewer={shellViewerOf(config.shell)}>
      <DevComposerPreview config={config} />
    </AppShell>
  );
};

export default DevComposerPage;
