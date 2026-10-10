import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

/**
 * Eski uygulamanın görselleri yalnızca Firebase Storage'da tutuluyordu. Başka host'tan görsel
 * yüklemek okurun IP'sini/okuma zamanını üçüncü tarafa sızdırır (izleme pikseli) ve kirli veriyle
 * keyfi içerik gösterir; bu yüzden tam host eşleşmeli allowlist (alt alan adı kabul edilmez).
 */
export const LEGACY_MEDIA_HOSTS: ReadonlySet<string> = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
]);

/** Yalnızca https ve Firebase Storage host'ları (`javascript:`/`data:`/karışık içerik dışarıda). */
export const toSafeMediaSrc = (raw: string | null): string | null => {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const safe =
      url.protocol === 'https:' &&
      url.username === '' &&
      url.password === '' &&
      url.port === '' &&
      LEGACY_MEDIA_HOSTS.has(url.hostname);
    return safe ? url.href : null;
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
        // Gönderi/profil adresi Storage isteğinde Referer olarak gitmesin
        referrerPolicy='no-referrer'
        sizes='(min-width: 768px) 560px, 100vw'
        className='object-cover'
      />
    </div>
  );
};
