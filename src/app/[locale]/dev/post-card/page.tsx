import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';
import { z } from 'zod';

import { PostCard } from '@/features/posts/components/post-card';
import {
  PostCardError,
  PostCardSkeleton,
  PostCardUnavailable,
} from '@/features/posts/components/post-card-states';
import { ALL_FIXTURE_POSTS, FIXTURE_NOW, POST_ALL_ENTITIES } from '@/features/posts/fixtures';
import { routing } from '@/i18n/routing';
import { devPagesEnabled } from '@/lib/env.dev-pages';

import { DevStockCardProvider } from './dev-stock-card-provider';
import { STATS_MODES, VIEWER_MODES } from './modes';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const searchSchema = z.object({
  stats: z.enum(STATS_MODES).catch('ok'),
  viewer: z.enum(VIEWER_MODES).catch('unknown'),
});

type DevPostCardPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Geçici önizleme (S6): PostCard/RichText fixture'ları Playwright testleri için. Yalnızca
 * development/test ortamında; prod build'de `ENABLE_DEV_PAGES=1` olmadan 404.
 */
const DevPostCardPage = async ({
  params,
  searchParams,
}: DevPostCardPageProps): Promise<ReactElement> => {
  // Bayrak istek anında okunsun (statik üretimde build ortamına donmasın)
  await connection();
  if (!devPagesEnabled()) notFound();

  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const { stats, viewer } = searchSchema.parse(await searchParams);

  return (
    <main id='main' className='mx-auto w-full max-w-feed py-4'>
      <DevStockCardProvider stats={stats} viewer={viewer}>
        {ALL_FIXTURE_POSTS.map(post => (
          <section key={post.id} data-testid={`fixture-${post.id}`}>
            <PostCard post={post} now={FIXTURE_NOW} />
          </section>
        ))}
        <section data-testid='fixture-detail'>
          <PostCard post={{ ...POST_ALL_ENTITIES, id: 7 }} variant='detail' now={FIXTURE_NOW} />
        </section>
        <section data-testid='state-loading'>
          <PostCardSkeleton />
        </section>
        <section data-testid='state-error'>
          <PostCardError />
        </section>
        <section data-testid='state-empty'>
          <PostCardUnavailable />
        </section>
      </DevStockCardProvider>
    </main>
  );
};

export default DevPostCardPage;
