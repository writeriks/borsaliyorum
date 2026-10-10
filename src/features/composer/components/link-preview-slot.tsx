'use client';

import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

import { useDebouncedValue } from '../hooks/use-browser';
import { composerQueryKeys } from '../hooks/use-autocomplete-data';
import type { ComposerServices } from '../types';

const PREVIEW_DEBOUNCE_MS = 600;

type LinkPreviewSlotProps = {
  url: string | null;
  services: ComposerServices;
  onDismiss: () => void;
};

/**
 * Composer'daki link önizlemesi (tasarım §6, ADR-0002 Karar 6): ilk önizlenebilir URL için
 * 600 ms boşta kalınca S9 ucu çağrılır. Hata ya da meta yoksa sessizce kart yok; gönderi
 * engellenmez. M1'de görsel yok (K6): yalnızca site, başlık, açıklama.
 */
export const LinkPreviewSlot = ({
  url,
  services,
  onDismiss,
}: LinkPreviewSlotProps): ReactElement | null => {
  const t = useTranslations('composer.linkPreview');
  const debouncedUrl = useDebouncedValue(url, PREVIEW_DEBOUNCE_MS);
  const settled = debouncedUrl === url ? url : null;
  const query = useQuery({
    queryKey: composerQueryKeys.linkPreview(settled ?? ''),
    queryFn: ({ signal }) => (settled ? services.linkPreview(settled, signal) : null),
    enabled: settled !== null,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  if (!url) return null;
  const pending = settled === null || query.isPending;
  if (!pending && (query.isError || !query.data)) return null;

  return (
    <div className='relative' data-testid='composer-link-preview'>
      {pending ? (
        <div
          aria-hidden='true'
          data-testid='link-preview-skeleton'
          className='flex h-22 flex-col justify-center gap-2 rounded-lg border border-border px-3'
        >
          <Skeleton className='h-3 w-24' />
          <Skeleton className='h-3 w-3/4' />
          <Skeleton className='h-3 w-1/2' />
        </div>
      ) : query.data ? (
        <div className='flex h-22 flex-col justify-center gap-0.5 rounded-lg border border-border px-3 pr-12'>
          <span className='truncate text-xs text-fg-subtle'>{query.data.host}</span>
          <span className='line-clamp-1 text-sm font-semibold text-fg'>{query.data.title}</span>
          {query.data.description ? (
            <span className='line-clamp-1 text-sm text-fg-muted max-sm:hidden'>
              {query.data.description}
            </span>
          ) : null}
        </div>
      ) : null}
      <button
        type='button'
        aria-label={t('remove')}
        onClick={onDismiss}
        className='absolute top-0 right-0 inline-flex size-hit items-center justify-center rounded-md text-fg-muted hover:bg-bg-muted hover:text-fg'
      >
        <X aria-hidden='true' className='size-4' />
      </button>
    </div>
  );
};
