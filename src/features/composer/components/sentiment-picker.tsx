'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RadioGroup } from 'radix-ui';
import { type ReactElement, useId } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { SENTIMENTS, type Sentiment } from '../types';

const GLYPH: Readonly<Record<Sentiment, string>> = { bullish: '▲', bearish: '▼', neutral: '–' };

const SELECTED_CLASS: Readonly<Record<Sentiment, string>> = {
  bullish:
    'data-[state=checked]:border-up data-[state=checked]:bg-up-bg data-[state=checked]:text-up',
  bearish:
    'data-[state=checked]:border-down data-[state=checked]:bg-down-bg data-[state=checked]:text-down',
  neutral:
    'data-[state=checked]:border-border-strong data-[state=checked]:bg-bg-muted data-[state=checked]:text-fg',
};

const isSentiment = (value: string): value is Sentiment =>
  (SENTIMENTS as readonly string[]).includes(value);

type SentimentPickerProps = {
  value: Sentiment;
  onChange: (value: Sentiment) => void;
  disabled?: boolean;
};

/**
 * "Görüşün" (tasarım §1.5): yalnızca tanınmış cashtag varken render edilir. Varsayılan Nötr
 * (kullanıcıyı yön almaya itmiyoruz). Radix RadioGroup: tek tab durağı, ok tuşlarıyla gezinme.
 * Yön asla yalnızca renkle değil: glif + metin.
 */
export const SentimentPicker = ({
  value,
  onChange,
  disabled = false,
}: SentimentPickerProps): ReactElement => {
  const t = useTranslations('composer.sentiment');
  const labelId = useId();

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span id={labelId} className='text-sm text-fg-muted'>
        {t('label')}
      </span>
      <RadioGroup.Root
        aria-labelledby={labelId}
        value={value}
        onValueChange={next => {
          if (isSentiment(next)) onChange(next);
        }}
        disabled={disabled}
        orientation='horizontal'
        loop
        className='flex flex-wrap items-center gap-1'
      >
        {SENTIMENTS.map(sentiment => (
          <RadioGroup.Item
            key={sentiment}
            value={sentiment}
            className={cn(
              // Görünür 32 px, dokunma alanı 44 px (::before ile genişletilir)
              'relative inline-flex h-8 items-center gap-1 rounded-full border border-border-strong px-3 text-sm text-fg-muted',
              'before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[""]',
              'hover:bg-bg-muted disabled:opacity-60',
              SELECTED_CLASS[sentiment]
            )}
          >
            <span aria-hidden='true'>{GLYPH[sentiment]}</span>
            {t(sentiment)}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      <Tooltip>
        <TooltipTrigger
          type='button'
          aria-label={t('help')}
          className='inline-flex size-hit items-center justify-center rounded-md text-fg-subtle hover:text-fg'
        >
          <Info aria-hidden='true' className='size-4' />
        </TooltipTrigger>
        <TooltipContent className='max-w-64'>{t('help')}</TooltipContent>
      </Tooltip>
    </div>
  );
};
