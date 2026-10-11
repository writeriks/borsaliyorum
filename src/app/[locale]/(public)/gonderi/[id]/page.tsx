import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { CommentThread } from '@/features/comments/components/comment-thread';
import { getCommentsPage } from '@/features/comments/server/queries';
import type { CommentsPage } from '@/features/comments/types';
import { PostCard } from '@/features/posts/components/post-card';
import { PostDetailHeader } from '@/features/posts/components/post-detail-header';
import { postHref } from '@/features/posts/components/post-href';
import { buildPostMetadata, notFoundPostMetadata } from '@/features/posts/metadata';
import { parsePostIdParam } from '@/features/posts/schemas';
import { getPostById } from '@/features/posts/server/queries';
import { getPathname } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/page-params';
import { routing } from '@/i18n/routing';
import { getCurrentUser } from '@/lib/auth/session';
import { getSiteUrl } from '@/lib/env.server';
import { logger } from '@/lib/logger';

type PostPageProps = { params: Promise<{ locale: string; id: string }> };

const log = logger.child({ module: 'post-detail-page' });

const siteMetadataBase = (): URL | undefined => {
  const site = getSiteUrl();
  return site ? new URL(site) : undefined;
};

export const generateMetadata = async ({ params }: PostPageProps): Promise<Metadata> => {
  const { locale: raw, id: rawId } = await params;
  const locale = resolveLocale(raw);
  const t = await getTranslations({ locale, namespace: 'postDetail' });
  const tMeta = await getTranslations({ locale, namespace: 'metadata' });
  const siteName = tMeta('title');
  const id = parsePostIdParam(rawId);
  const detail = id === null ? null : await getPostById(id);
  // Görünmeyen her durum aynı 404 meta'sı (hangi neden olduğu sızmasın)
  if (id === null || detail?.status !== 'ok') {
    return notFoundPostMetadata(t('notFoundMetaTitle'), siteName);
  }
  const href = postHref(id);
  return {
    metadataBase: siteMetadataBase(),
    ...buildPostMetadata(
      detail.post,
      {
        canonical: getPathname({ href, locale }),
        languages: {
          ...Object.fromEntries(
            routing.locales.map(code => [code, getPathname({ href, locale: code })])
          ),
          'x-default': getPathname({ href, locale: routing.defaultLocale }),
        },
      },
      {
        title: values => t('metaTitle', values),
        titleNoText: values => t('metaTitleNoText', values),
        siteName,
      }
    ),
  };
};

/** İlk yorum sayfası; hata sayfayı düşürmez (liste istemcide yeniden dener). */
const loadFirstComments = async (postId: number): Promise<CommentsPage | null> => {
  try {
    const result = await getCommentsPage(postId, null);
    return result.ok ? result.data : null;
  } catch (error) {
    log.error('first comments page failed', { err: error, postId });
    return null;
  }
};

/**
 * Giriş/kayıt linki: `Link` yerel önekini kendisi ekler (yol öneksiz); `next` ise girişten sonra
 * sunucunun doğrudan gideceği **önekli** ham yol (`redirectToNext`, `/en/gonderi/1`).
 */
const authHref = (pathname: '/giris' | '/kayit', next: string): string =>
  `${pathname}?${new URLSearchParams({ next }).toString()}`;

/**
 * Gönderi detayı (S12, K7 `/gonderi/:id`, public: anonim de okur). Kart genişletilmiş (gövde
 * kırpılmaz), altında yorum composer'ı ve eskiden yeniye yorumlar. Olmayan, silinmiş (moderasyon
 * dahil), engelli ya da yazarı etkin olmayan gönderi ve geçersiz kimlik aynı 404'tür
 * (`not-found.tsx`, noindex): neden ayırt edilmez.
 */
const PostPage = async ({ params }: PostPageProps): Promise<ReactElement> => {
  const { locale: raw, id: rawId } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const id = parsePostIdParam(rawId);
  if (id === null) notFound();
  const detail = await getPostById(id);
  if (detail.status !== 'ok') notFound();

  const viewer = await getCurrentUser();
  const t = await getTranslations({ locale, namespace: 'postDetail' });
  const tComments = await getTranslations({ locale, namespace: 'comments' });
  const here = getPathname({ href: postHref(id), locale });
  const initialPage = await loadFirstComments(id);

  return (
    <AppShell>
      <div className='flex flex-col'>
        <PostDetailHeader title={t('title')} fallbackHref={viewer ? '/akis' : '/'} />
        <PostCard post={detail.post} variant='detail' />
        <section aria-labelledby='comments-heading' data-testid='comments'>
          <h2
            id='comments-heading'
            className='border-b border-border px-4 py-3 text-sm font-semibold text-fg-muted'
          >
            {tComments('heading')}
          </h2>
          <CommentThread
            postId={id}
            viewerId={viewer?.userId ?? null}
            replyToUsername={detail.post.author.username}
            loginHref={authHref('/giris', here)}
            signupHref={authHref('/kayit', here)}
            initialPage={initialPage}
          />
        </section>
      </div>
    </AppShell>
  );
};

export default PostPage;
