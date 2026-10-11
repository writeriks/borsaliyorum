import type { Metadata } from 'next';

import { cleanPreviewText } from '@/lib/link-preview/parse-meta';

import type { PostDetail } from './types';

/** Arama/paylaşım açıklaması (v2-milestone-1 "Detay": düz metnin ilk 160 karakteri). */
export const DESCRIPTION_MAX = 160;
/** Başlıktaki alıntı: sekme ve paylaşım kartında okunur kalsın. */
export const TITLE_EXCERPT_MAX = 60;

export type PostMetadataLabels = {
  /** "{name}: “{excerpt}”" */
  title: (values: { name: string; excerpt: string }) => string;
  /** Metinsiz (yalnızca görsel) gönderi: "Gönderen: {name}" */
  titleNoText: (values: { name: string }) => string;
  removed: string;
  unavailable: string;
  siteName: string;
};

/**
 * Gönderi detayının metadata'sı (saf; unit testli). İçerik **düz metinden** üretilir: eski
 * markup (`$(THYAO)`) ve entity JSON'u sızmaz, kontrol/görünmez karakterler temizlenir, satırlar
 * tek satıra iner; HTML kaçışı Next'in `<meta>` render'ında. Silinmiş/görüntülenemeyen gönderi
 * `noindex` ve içeriksiz (yazar adı da yok). Görünür gönderi indekslenir (production dışını
 * `X-Robots-Tag` zaten kapatır, next.config).
 */
export const buildPostMetadata = (
  detail: PostDetail,
  path: string,
  labels: PostMetadataLabels
): Metadata => {
  if (detail.status !== 'ok') {
    const title = detail.status === 'unavailable' ? labels.unavailable : labels.removed;
    return { title: `${title} · ${labels.siteName}`, robots: { index: false, follow: false } };
  }
  const { post } = detail;
  const name = cleanPreviewText(post.author.displayName, 50) ?? post.author.username;
  const excerpt = cleanPreviewText(post.body.text, TITLE_EXCERPT_MAX);
  const description = cleanPreviewText(post.body.text, DESCRIPTION_MAX) ?? undefined;
  const title = excerpt ? labels.title({ name, excerpt }) : labels.titleNoText({ name });
  return {
    title: `${title} · ${labels.siteName}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      title,
      description,
      url: path,
      siteName: labels.siteName,
      publishedTime: post.createdAt,
    },
    twitter: { card: 'summary', title, description },
  };
};
