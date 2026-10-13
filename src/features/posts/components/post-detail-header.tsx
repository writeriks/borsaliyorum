import type { ReactElement } from 'react';

import { BackButton } from './back-button';

/** Detay sayfası ve gönderiye özel 404'ün ortak başlık satırı ("Geri" + başlık). */
export const PostDetailHeader = ({
  title,
  fallbackHref,
}: {
  title: string;
  fallbackHref: string;
}): ReactElement => (
  <div className='flex items-center gap-2 border-b border-border px-2 py-1'>
    <BackButton fallbackHref={fallbackHref} />
    <h1 className='text-lg font-semibold text-fg'>{title}</h1>
  </div>
);
