import { MessageSquareOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { EmptyState } from '@/components/states/empty-state';
import { ErrorState } from '@/components/states/error-state';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Kartla aynı ölçüde iskelet (avatar, başlık satırı, 3 satır gövde, sayaç satırı). İçerik
 * yüklemesidir, auth durumu değil (`data-skeleton='content'`; auth flash testi ayırır).
 */
export const PostCardSkeleton = (): ReactElement => {
  const t = useTranslations('post');
  return (
    <div
      data-testid='post-card-skeleton'
      data-skeleton='content'
      aria-busy='true'
      className='flex gap-3 border-b border-border px-3 py-3 sm:px-4'
    >
      <span className='sr-only'>{t('loading')}</span>
      <Skeleton className='size-9 shrink-0 rounded-full sm:size-10' />
      <div className='flex flex-1 flex-col gap-2'>
        <Skeleton className='h-4 w-48' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-11/12' />
        <Skeleton className='h-4 w-2/3' />
        <div className='flex min-h-hit items-center gap-6'>
          <Skeleton className='h-4 w-10' />
          <Skeleton className='h-4 w-10' />
          <Skeleton className='h-4 w-10' />
        </div>
      </div>
    </div>
  );
};

/** Yükleme hatası; `onRetry` yalnızca istemci çağıranlardan gelir (fonksiyon serileştirilemez). */
export const PostCardError = ({
  onRetry,
}: {
  onRetry?: () => void | Promise<void>;
}): ReactElement => {
  const t = useTranslations('post');
  return <ErrorState message={t('error')} onRetry={onRetry} />;
};

/** Boş durum: gönderi silinmiş, engelleme nedeniyle görünmez ya da bulunamadı. */
export const PostCardUnavailable = (): ReactElement => {
  const t = useTranslations('post');
  return <EmptyState icon={MessageSquareOff} message={t('unavailable')} />;
};
