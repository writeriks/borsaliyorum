'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactElement, useId } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { SENTIMENTS, type Sentiment } from '../types';

const GLYPH: Readonly<Record<Sentiment, string>> = { bullish: '▲', bearish: '▼', neutral: '–' };

const SELECTED_CLASS: Readonly<Record<Sentiment, string>> = {
  bullish: 'has-checked:border-up has-checked:bg-up-bg has-checked:text-up',
  bearish: 'has-checked:border-down has-checked:bg-down-bg has-checked:text-down',
  neutral: 'has-checked:border-border-strong has-checked:bg-bg-muted has-checked:text-fg',
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
 * (kullanıcıyı yön almaya itmiyoruz). Yerel `<input type="radio">` grubu: tarayıcı tek tab
 * durağı ve ok tuşlarıyla (döngüsel) gezinmeyi kendisi sağlar; Radix RadioGroup composer
 * chunk'ına ~5 KB gz ekliyordu (ADR-0002 bütçesi). Yön asla yalnızca renkle değil: glif + metin.
 */
export const SentimentPicker = ({
  value,
  onChange,
  disabled = false,
}: SentimentPickerProps): ReactElement => {
  const t = useTranslations('composer.sentiment');
  const labelId = useId();
  const name = useId();

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span id={labelId} className='text-sm text-fg-muted'>
        {t('label')}
      </span>
      <div
        role='radiogroup'
        aria-labelledby={labelId}
        className='flex flex-wrap items-center gap-1'
      >
        {SENTIMENTS.map(sentiment => (
          <label
            key={sentiment}
            className={cn(
              // Görünür 32 px, dokunma alanı 44 px (::before ile genişletilir)
              'relative inline-flex h-8 cursor-pointer items-center gap-1 rounded-full border border-border-strong px-3 text-sm text-fg-muted',
              'before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[""]',
              'hover:bg-bg-muted has-disabled:cursor-default has-disabled:opacity-60',
              'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring',
              SELECTED_CLASS[sentiment]
            )}
          >
            <input
              type='radio'
              name={name}
              value={sentiment}
              checked={value === sentiment}
              disabled={disabled}
              onChange={event => {
                if (event.target.checked && isSentiment(event.target.value)) {
                  onChange(event.target.value);
                }
              }}
              className='sr-only'
            />
            <span aria-hidden='true'>{GLYPH[sentiment]}</span>
            {t(sentiment)}
          </label>
        ))}
      </div>
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
