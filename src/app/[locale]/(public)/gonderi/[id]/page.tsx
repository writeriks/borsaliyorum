import { EyeOff, MessageSquareOff } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactElement } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { EmptyState } from '@/components/states/empty-state';
import { Button } from '@/components/ui/button';
import { CommentThread } from '@/features/comments/components/comment-thread';
import { getCommentsPage } from '@/features/comments/server/queries';
import type { CommentsPage } from '@/features/comments/types';
import { BackButton } from '@/features/posts/components/back-button';
import { PostCard } from '@/features/posts/components/post-card';
import { postHref } from '@/features/posts/components/post-href';
import { buildPostMetadata } from '@/features/posts/metadata';
import { getPostById, MAX_POST_ID } from '@/features/posts/server/queries';
import { getPathname, Link } from '@/i18n/navigation';
import { resolveLocale } from '@/i18n/page-params';
import { getCurrentUser } from '@/lib/auth/session';
import { getSiteUrl } from '@/lib/env.server';
import { logger } from '@/lib/logger';

type PostPageProps = { params: Promise<{ locale: string; id: string }> };

const log = logger.child({ module: 'post-detail-page' });

/** URL'deki kimlik: başında sıfır olmayan, int4 aralığında pozitif tam sayı; başka her şey 404. */
const parsePostId = (raw: string): number | null => {
  if (!/^[1-9]\d{0,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id <= MAX_POST_ID ? id : null;
};

const siteMetadataBase = (): URL | undefined => {
  const site = getSiteUrl();
  return site ? new URL(site) : undefined;
};

export const generateMetadata = async ({ params }: PostPageProps): Promise<Metadata> => {
  const { locale: raw, id: rawId } = await params;
  const locale = resolveLocale(raw);
  const id = parsePostId(rawId);
  if (id === null) return {};
  const detail = await getPostById(id);
  if (detail.status === 'not-found') return {};
  const t = await getTranslations({ locale, namespace: 'postDetail' });
  const tMeta = await getTranslations({ locale, namespace: 'metadata' });
  return {
    metadataBase: siteMetadataBase(),
    ...buildPostMetadata(detail, getPathname({ href: postHref(id), locale }), {
      title: values => t('metaTitle', values),
      titleNoText: values => t('metaTitleNoText', values),
      removed: t('removedMetaTitle'),
      unavailable: t('unavailableMetaTitle'),
      siteName: tMeta('title'),
    }),
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
 * kırpılmaz), altında yorum composer'ı ve eskiden yeniye yorumlar. Silinmiş gönderi "kaldırıldı"
 * (sahibine moderasyon metni), engel/etkin olmayan yazar "görüntülenemiyor" durumu; ikisi de
 * `noindex` (generateMetadata). Olmayan gönderi 404.
 */
const PostPage = async ({ params }: PostPageProps): Promise<ReactElement> => {
  const { locale: raw, id: rawId } = await params;
  const locale = resolveLocale(raw);
  setRequestLocale(locale);
  const id = parsePostId(rawId);
  if (id === null) notFound();
  const detail = await getPostById(id);
  if (detail.status === 'not-found') notFound();

  const viewer = await getCurrentUser();
  const t = await getTranslations({ locale, namespace: 'postDetail' });
  const tComments = await getTranslations({ locale, namespace: 'comments' });
  const fallbackHref = viewer ? '/akis' : '/';

  let content: ReactElement;
  if (detail.status === 'ok') {
    const here = getPathname({ href: postHref(id), locale });
    const initialPage = await loadFirstComments(id);
    content = (
      <>
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
      </>
    );
  } else {
    const message =
      detail.status === 'unavailable'
        ? t('unavailable')
        : detail.byModeration
          ? t('removedByModeration')
          : t('removed');
    content = (
      <div data-testid='post-detail-state' data-state={detail.status}>
        <EmptyState
          icon={detail.status === 'unavailable' ? EyeOff : MessageSquareOff}
          message={message}
          action={
            <Button asChild variant='outline' size='lg'>
              <Link href={fallbackHref}>{viewer ? t('toFeed') : t('toHome')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <AppShell>
      <div className='flex flex-col'>
        <div className='flex items-center gap-2 border-b border-border px-2 py-1'>
          <BackButton fallbackHref={fallbackHref} />
          <h1 className='text-lg font-semibold text-fg'>{t('title')}</h1>
        </div>
        {content}
      </div>
    </AppShell>
  );
};

export default PostPage;
