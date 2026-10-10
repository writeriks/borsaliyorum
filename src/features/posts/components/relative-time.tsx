'use client';

import { useFormatter, useNow } from 'next-intl';
import type { ReactElement } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from '@/i18n/navigation';

type RelativeTimeProps = {
  /** ISO tarih */
  dateTime: string;
  /** Detay sayfası: kartın "detaya git" linki zaman öğesidir (tasarım §7.4). */
  href: string;
  id?: string;
  /** Sabit referans zamanı (test/önizleme); verilmezse dakikada bir güncellenen saat. */
  now?: string;
};

/**
 * Göreli zaman ("3 dk. önce"); tooltip'te tam tarih ("10 Eki 2026 14:32"), saat dilimi
 * Europe/Istanbul (i18n/request.ts ve sağlayıcıda tanımlı).
 */
export const RelativeTime = ({ dateTime, href, id, now }: RelativeTimeProps): ReactElement => {
  const format = useFormatter();
  const liveNow = useNow({ updateInterval: 60_000 });
  const date = new Date(dateTime);
  const reference = now ? new Date(now) : liveNow;
  const relative = format.relativeTime(date, { now: reference, style: 'short' });
  const full = format.dateTime(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={href} className='text-fg-subtle hover:underline'>
          {/* Sunucu ile istemcinin "şimdi"si dakika sınırında farklı olabilir */}
          <time id={id} dateTime={date.toISOString()} suppressHydrationWarning>
            {relative}
          </time>
        </Link>
      </TooltipTrigger>
      <TooltipContent>{full}</TooltipContent>
    </Tooltip>
  );
};
