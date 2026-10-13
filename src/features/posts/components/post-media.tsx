import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { toSafeMediaSrc } from '@/lib/media';

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
        // Gönderi/profil adresi Storage isteğinde Referer olarak gitmesin
        referrerPolicy='no-referrer'
        sizes='(min-width: 768px) 560px, 100vw'
        className='object-cover'
      />
    </div>
  );
};
