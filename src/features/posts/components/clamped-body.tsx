'use client';

import { useTranslations } from 'next-intl';
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

type ClampedBodyProps = { id: string; children: ReactNode };

/**
 * Akışta gövde 6 satırla sınırlı, taşarsa "Devamını gör" (tasarım §3.2, §7.4). Buton yalnızca
 * gerçekten taşan metinde görünür; ölçüm istemcide, sunucu HTML'i zaten kırpılmış gelir (CLS yok).
 */
export const ClampedBody = ({ id, children }: ClampedBodyProps): ReactElement => {
  const t = useTranslations('post');
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || expanded) return undefined;
    // ResizeObserver gözlem başlar başlamaz bir kez çağrılır: ilk ölçüm de buradan gelir.
    const observer = new ResizeObserver(() => {
      // Linklerin dokunma alanı (`before:` -6px) scrollHeight'a birkaç piksel ekler; gerçek taşma
      // en az yarım satırdır.
      const lineHeight = parseFloat(
        getComputedStyle(element.firstElementChild ?? element).lineHeight
      );
      const threshold = Number.isFinite(lineHeight) ? lineHeight / 2 : 8;
      setOverflowing(element.scrollHeight - element.clientHeight > threshold);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded]);

  return (
    <div className='flex flex-col items-start'>
      <div id={id} ref={ref} className={cn('w-full', !expanded && 'line-clamp-6')}>
        {children}
      </div>
      {overflowing || expanded ? (
        <button
          type='button'
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(value => !value)}
          className='inline-flex min-h-hit items-center text-sm font-medium text-accent hover:underline'
        >
          {expanded ? t('readLess') : t('readMore')}
        </button>
      ) : null}
    </div>
  );
};
