'use client';

import type { ReactElement } from 'react';

import { PostComposer } from '@/features/posts/components/post-composer';
import { useRouter } from '@/i18n/navigation';

import { FEED_PATH } from './feed-tabs';

/**
 * `/paylas` (CMP-03): tam ekran composer sheet'i, editör odakta. Kapatmak = geri gitmek
 * (tarayıcı geri tuşu da sheet'i kapatır, çünkü sheet bir rotadır). Doğrudan açıldıysa (geçmiş
 * yok) akışa döner. Paylaşınca akışa **replace** ile gidilir: geri tuşu boş sheet'e dönmez; akış
 * dinamik olduğu için yeni gönderi en üstte gelir.
 */
export const ComposeSheet = ({ viewerId }: { viewerId: number }): ReactElement => {
  const router = useRouter();
  const close = (): void => {
    if (window.history.length > 1) router.back();
    else router.replace(FEED_PATH);
  };
  return (
    <PostComposer
      viewerId={viewerId}
      layout='sheet'
      autoFocus
      onClose={close}
      onPosted={() => router.replace(FEED_PATH)}
    />
  );
};
