import type { LinkPreviewDto } from '@/lib/link-preview/types';

export type { LinkPreviewDto };

/** `GET /api/link-preview` başarılı gövdesi: önizleme yoksa (engelli, hata, başlıksız) null. */
export type LinkPreviewResponse = { readonly preview: LinkPreviewDto | null };
