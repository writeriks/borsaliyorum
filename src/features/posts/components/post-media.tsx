import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

/** Yalnızca https görseller (karışık içerik ve `javascript:`/`data:` kaynakları dışarıda). */
export const toSafeMediaSrc = (raw: string | null): string | null => {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && url.username === '' && url.password === ''
      ? url.href
      : null;
  } catch {
    // Eski veride bozuk URL olabilir; görsel gösterilmez.
    return null;
  }
};

/**
 * Eski uygulamadan kalan tek görsel (K10: v2'de yükleme yok). Sabit oranlı kutu: görsel
 * yüklenmeden önce de yer kaplar (CLS yok). Eski görsellerin alt metni yok → genel açıklama.
 * `unoptimized`: `_next/image` keyfi host'lar için açık proxy olmasın diye kullanılmaz.
 */
export const PostMedia = ({ src }: { src: string | null }): ReactElement | null => {
  const t = useTranslations('post');
  const safe = toSafeMediaSrc(src);
  if (safe === null) return null;
  return (
    <div className='relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-bg-muted'>
      <Image
        src={safe}
        alt={t('mediaAlt')}
        fill
        unoptimized
        sizes='(min-width: 768px) 560px, 100vw'
        className='object-cover'
      />
    </div>
  );
};
