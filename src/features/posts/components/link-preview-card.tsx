import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { displayHostOf, toSafeExternalHref, UGC_LINK_REL } from '@/components/rich-text';
import { Skeleton } from '@/components/ui/skeleton';

import type { PostLinkPreview } from '../types';

// Kompakt kart 88px (tasarım §6): yer önceden rezerve edilir, iskelet ile kart aynı ölçüde (CLS yok).
const SHELL = 'flex min-h-22 w-full gap-3 rounded-lg border border-border p-3';

export const LinkPreviewSkeleton = (): ReactElement => {
  const t = useTranslations('post');
  return (
    <div data-testid='link-preview-skeleton' aria-busy='true' className={SHELL}>
      <span className='sr-only'>{t('linkPreviewLoading')}</span>
      <div className='flex flex-1 flex-col gap-2'>
        <Skeleton className='h-3 w-24' />
        <Skeleton className='h-4 w-4/5' />
        <Skeleton className='h-4 w-3/5' />
      </div>
    </div>
  );
};

/**
 * Link önizleme metin kartı (M1'de görsel yok, K6). Tümü tek bir dış link; kaynak (host) her zaman
 * görünür (legal HD-4). Başlık yoksa ya da URL http(s) değilse kart render edilmez.
 */
export const LinkPreviewCard = ({ preview }: { preview: PostLinkPreview }): ReactElement | null => {
  const t = useTranslations();
  if (preview.status === 'none') return null;
  if (preview.status === 'pending') return <LinkPreviewSkeleton />;

  const href = toSafeExternalHref(preview.url);
  const host = displayHostOf(preview.url);
  const title = preview.title?.trim();
  if (href === null || host === null || !title) return null;

  return (
    <a
      href={href}
      target='_blank'
      rel={UGC_LINK_REL}
      aria-label={t('post.linkPreviewName', { title, host })}
      data-testid='link-preview-card'
      className={`${SHELL} transition-colors duration-(--duration-fast) hover:bg-bg-muted`}
    >
      <div className='flex min-w-0 flex-1 flex-col gap-1'>
        <span className='flex items-center gap-1.5 text-xs text-fg-subtle'>
          <Globe aria-hidden='true' className='size-4 shrink-0' strokeWidth={1.75} />
          <span className='truncate'>{host}</span>
        </span>
        <span className='line-clamp-2 text-sm font-semibold text-fg'>{title}</span>
        {preview.description ? (
          <span className='line-clamp-2 hidden text-sm text-fg-muted sm:block'>
            {preview.description}
          </span>
        ) : null}
      </div>
    </a>
  );
};
