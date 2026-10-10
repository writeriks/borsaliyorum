import { Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { UGC_LINK_REL } from '@/components/rich-text/entity-routes';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import type { LinkPreviewDto } from '../types';

// Kart yüksekliği sabittir (tasarım §6: kompakt 88px); yükleme ↔ içerik geçişinde CLS olmaz.
const CARD_CLASS =
  'flex h-22 w-full items-start gap-3 overflow-hidden rounded-lg border border-border p-3';

type LinkPreviewCardProps = {
  preview: LinkPreviewDto;
  className?: string;
};

/**
 * Metin önizleme kartı (K6: görsel yok). Tamamı tek bir link; kaynak host her zaman görünür
 * (legal "Hukuki değerlendirme 4"). Metinler React tarafından escape edilir.
 */
export const LinkPreviewCard = ({ preview, className }: LinkPreviewCardProps): ReactElement => {
  const t = useTranslations('linkPreview');
  return (
    <a
      href={preview.url}
      target='_blank'
      rel={UGC_LINK_REL}
      aria-label={t('cardLabel', { title: preview.title, host: preview.host })}
      data-slot='link-preview-card'
      className={cn(CARD_CLASS, 'transition-colors hover:bg-bg-muted', className)}
    >
      <Globe aria-hidden='true' className='mt-0.5 size-4 shrink-0 text-fg-subtle' />
      <span className='flex min-w-0 flex-col gap-1'>
        <span className='truncate text-xs text-fg-subtle'>{preview.host}</span>
        <span className='line-clamp-1 text-sm font-semibold text-fg'>{preview.title}</span>
        {preview.description ? (
          <span className='line-clamp-1 hidden text-sm text-fg-muted sm:block'>
            {preview.description}
          </span>
        ) : null}
      </span>
    </a>
  );
};

/** Composer'da önizleme beklenirken kartla aynı ölçüde yer tutucu. */
export const LinkPreviewCardSkeleton = ({ className }: { className?: string }): ReactElement => {
  const t = useTranslations('linkPreview');
  return (
    <div
      role='status'
      aria-busy='true'
      aria-label={t('loading')}
      data-slot='link-preview-skeleton'
      className={cn(CARD_CLASS, className)}
    >
      <Skeleton className='size-4 shrink-0 rounded-sm' />
      <span className='flex min-w-0 flex-1 flex-col gap-2'>
        <Skeleton className='h-3 w-24' />
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-4 w-1/2' />
      </span>
    </div>
  );
};
