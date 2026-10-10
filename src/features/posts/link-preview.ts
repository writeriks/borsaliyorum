import { displayHostOf, toSafeExternalHref } from '@/components/rich-text/url-display';
import type { LinkPreviewDto } from '@/features/link-preview/types';

import type { PostLinkPreview } from './types';

const nonEmpty = (value: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Gönderide saklı önizlemeyi tek kart bileşeninin (link-preview özelliği) DTO'suna çevirir.
 * Render anında yeniden doğrulama burada (ADR-0002 Karar 5): href yalnızca http(s), kaynak host
 * görünür (legal), başlık zorunlu. Kart çizilemiyorsa null. `pending` salt okunur kartta hiçbir şey
 * göstermez: önizleme hazır olana kadar kart yok, sonsuz iskelet yok.
 */
export const toLinkPreviewDto = (preview: PostLinkPreview): LinkPreviewDto | null => {
  if (preview.status !== 'ready') return null;
  const url = toSafeExternalHref(preview.url);
  const host = url === null ? null : displayHostOf(url);
  const title = nonEmpty(preview.title);
  if (url === null || host === null || title === null) return null;
  return {
    url,
    host,
    siteName: nonEmpty(preview.siteName),
    title,
    description: nonEmpty(preview.description),
  };
};
