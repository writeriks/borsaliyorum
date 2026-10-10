'use client';

import { useTranslations } from 'next-intl';
import { type ReactElement, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { getCounterAnnouncement, getCounterState } from '../lib/limits';

type CharCounterProps = { id: string; count: number; limit: number };

const RADIUS = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TONE_CLASS = {
  hidden: '',
  subtle: 'text-fg-subtle',
  warn: 'text-warn',
  danger: 'text-danger',
} as const;

/**
 * Grafem sayacı (tasarım §1.3): %80 altında gizli, sonra halka + kalan sayı. Renk tek başına
 * değil, sayı da değişir. Ekran okuyucuya yalnızca eşiklerde (100, 20, 0, aşım) tek duyuru.
 */
export const CharCounter = ({ id, count, limit }: CharCounterProps): ReactElement => {
  const t = useTranslations('composer.counter');
  const state = getCounterState(count, limit);
  const previous = useRef(state.remaining);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const next = getCounterAnnouncement(previous.current, state.remaining);
    previous.current = state.remaining;
    if (!next) return;
    setAnnouncement(
      next.kind === 'over' ? t('over', { n: -state.remaining }) : t('remaining', { n: next.n })
    );
  }, [state.remaining, t]);

  return (
    <>
      <span
        id={id}
        data-testid='char-counter'
        data-tone={state.tone}
        className={cn('flex items-center gap-1.5 text-xs tabular-nums', TONE_CLASS[state.tone])}
      >
        {state.tone === 'hidden' ? null : (
          <>
            <svg aria-hidden='true' viewBox='0 0 20 20' className='size-5 -rotate-90'>
              <circle
                cx='10'
                cy='10'
                r={RADIUS}
                fill='none'
                strokeWidth='2'
                className='stroke-border'
              />
              <circle
                cx='10'
                cy='10'
                r={RADIUS}
                fill='none'
                strokeWidth='2'
                stroke='currentColor'
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - state.ratio)}
                strokeLinecap='round'
              />
            </svg>
            <span data-testid='char-counter-value'>{state.remaining}</span>
            <span className='sr-only'>
              {state.remaining < 0
                ? t('over', { n: -state.remaining })
                : t('remaining', { n: state.remaining })}
            </span>
          </>
        )}
      </span>
      <span role='status' aria-live='polite' className='sr-only' data-testid='char-counter-live'>
        {announcement}
      </span>
    </>
  );
};
