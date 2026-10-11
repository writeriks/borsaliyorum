import type { Metadata } from 'next';

import { cleanPreviewText } from '@/lib/link-preview/parse-meta';

import type { PostCardData } from './types';

/** Arama/paylaşım açıklaması (v2-milestone-1 "Detay": düz metnin ilk 160 karakteri). */
export const DESCRIPTION_MAX = 160;
/** Başlıktaki alıntı: sekme ve paylaşım kartında okunur kalsın. */
export const TITLE_EXCERPT_MAX = 60;

export type PostMetadataLabels = {
  /** "{name}: “{excerpt}”" */
  title: (values: { name: string; excerpt: string }) => string;
  /** Metinsiz (yalnızca görsel) gönderi: "Gönderen: {name}" */
  titleNoText: (values: { name: string }) => string;
  siteName: string;
};

export type PostMetadataPaths = {
  /** Bu sayfanın yerel önekli yolu (`/gonderi/1`, `/en/gonderi/1`). */
  canonical: string;
  /** hreflang: dil → o dildeki yol; `x-default` varsayılan dil (tr, öneksiz). */
  languages: Record<string, string>;
};

/**
 * Görünür gönderinin metadata'sı (saf; unit testli). İçerik **düz metinden** üretilir: eski
 * markup (`$(THYAO)`) ve entity JSON'u sızmaz, kontrol/görünmez karakterler temizlenir, satırlar
 * tek satıra iner; HTML kaçışı Next'in `<meta>` render'ında. Görünmeyen gönderi (silinmiş, engel,
 * etkin olmayan yazar) bu fonksiyona gelmez: sayfa 404 olur (`notFoundPostMetadata`).
 */
export const buildPostMetadata = (
  post: PostCardData,
  paths: PostMetadataPaths,
  labels: PostMetadataLabels
): Metadata => {
  const name = cleanPreviewText(post.author.displayName, 50) ?? post.author.username;
  const excerpt = cleanPreviewText(post.body.text, TITLE_EXCERPT_MAX);
  const description = cleanPreviewText(post.body.text, DESCRIPTION_MAX) ?? undefined;
  const title = excerpt ? labels.title({ name, excerpt }) : labels.titleNoText({ name });
  return {
    title: `${title} · ${labels.siteName}`,
    description,
    alternates: { canonical: paths.canonical, languages: paths.languages },
    openGraph: {
      type: 'article',
      title,
      description,
      url: paths.canonical,
      siteName: labels.siteName,
      publishedTime: post.createdAt,
    },
    twitter: { card: 'summary', title, description },
  };
};

/**
 * Bulunamayan/görüntülenemeyen gönderi: içeriksiz (yazar adı da yok). `robots` verilmez: Next
 * `notFound()` yanıtına `noindex`'i kendisi ekler (ikinci bir meta kopya olurdu; E2E doğrular).
 */
export const notFoundPostMetadata = (title: string, siteName: string): Metadata => ({
  title: `${title} · ${siteName}`,
});
