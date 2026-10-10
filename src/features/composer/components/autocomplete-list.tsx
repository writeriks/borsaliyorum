'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties, MouseEvent, PointerEvent, ReactElement, ReactNode, Ref } from 'react';
import { useRef } from 'react';

import { Avatar, AvatarFallback, AvatarImage, initialsOf } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { TriggerKind } from '@/lib/entities';
import { cn } from '@/lib/utils';

import type { AcHeading, AcOption } from '../hooks/use-autocomplete-data';

export type AcView =
  | { state: 'loading' }
  | { state: 'error' }
  | { state: 'empty'; isDefault: boolean }
  | { state: 'options'; options: AcOption[]; refreshing: boolean };

type AutocompleteListProps = {
  kind: TriggerKind;
  query: string;
  heading: AcHeading;
  view: AcView;
  /** Klavyeyle seçilebilir öğe sayısı içinde aktif olan; hata durumunda 0 = "Tekrar dene". */
  activeIndex: number;
  listboxId: string;
  optionId: (index: number) => string;
  onSelect: (index: number) => void;
  onHover: (index: number) => void;
  variant: 'popover' | 'panel';
  ref?: Ref<HTMLDivElement>;
  style?: CSSProperties;
};

const LISTBOX_LABEL = { cashtag: 'stocks', hashtag: 'tags', mention: 'users' } as const;

/** Eşleşen kısım kalın (renk değişmez, tasarım §2.3); Türkçe küçük harfe göre aranır. */
const Highlight = ({ text, query }: { text: string; query: string }): ReactNode => {
  const q = query.toLocaleLowerCase('tr-TR');
  const at = q ? text.toLocaleLowerCase('tr-TR').indexOf(q) : -1;
  if (at < 0 || text.length !== text.toLocaleLowerCase('tr-TR').length) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className='font-semibold'>{text.slice(at, at + q.length)}</span>
      {text.slice(at + q.length)}
    </>
  );
};

// Dokunmada kaydırma hareketi seçim yapmaz: pointerup'ta 10 px'ten az hareket şartı (§2.6)
const TAP_SLOP_PX = 10;

export const AutocompleteList = ({
  kind,
  query,
  heading,
  view,
  activeIndex,
  listboxId,
  optionId,
  onSelect,
  onHover,
  variant,
  ref,
  style,
}: AutocompleteListProps): ReactElement => {
  const t = useTranslations('ac');
  const tCommon = useTranslations('common');
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  // Editör odağını korur ([AC-21]): mousedown varsayılanı odağı listeye taşırdı
  const keepFocus = (event: MouseEvent): void => event.preventDefault();
  const handlePointerDown = (event: PointerEvent): void => {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };
  // Olay delegasyonu: seçenek, dokunulan öğenin `data-index`'inden bulunur
  const handlePointerUp = (event: PointerEvent): void => {
    const start = pointerStart.current;
    pointerStart.current = null;
    const target = event.target instanceof Element ? event.target.closest('[data-index]') : null;
    const index = Number(target?.getAttribute('data-index'));
    if (!start || !Number.isInteger(index)) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < TAP_SLOP_PX) {
      onSelect(index);
    }
  };

  const optionProps = (index: number, label: string) => ({
    id: optionId(index),
    role: 'option' as const,
    'aria-selected': index === activeIndex,
    'aria-label': label,
    'data-active': index === activeIndex ? 'true' : undefined,
    'data-index': index,
    onMouseEnter: () => onHover(index),
    className: cn(
      'flex cursor-pointer items-center gap-3 border-l-3 border-transparent px-3 text-sm',
      variant === 'panel' ? 'min-h-14' : 'min-h-12',
      index === activeIndex && 'border-accent bg-bg-muted'
    ),
  });

  const renderOption = (option: AcOption, index: number): ReactElement => {
    switch (option.kind) {
      case 'cashtag': {
        const market = t(`market.${option.stock.type}`);
        return (
          <div
            key={option.key}
            {...optionProps(index, `${option.stock.t}, ${option.stock.n}, ${market}`)}
          >
            <span
              aria-hidden='true'
              className='flex size-6 shrink-0 items-center justify-center rounded-sm bg-bg-muted text-xs font-semibold text-fg-muted'
            >
              {option.stock.t.slice(0, 2)}
            </span>
            <span className='font-semibold text-fg tabular-nums'>
              <Highlight text={option.stock.t} query={query} />
            </span>
            <span className='min-w-0 flex-1 truncate text-fg-muted'>
              <Highlight text={option.stock.n} query={query} />
            </span>
            <span className='text-xs text-fg-subtle'>{market}</span>
          </div>
        );
      }
      case 'hashtag': {
        const count = t('tagCount', { count: option.tag.count });
        return (
          <div key={option.key} {...optionProps(index, `#${option.tag.name}, ${count}`)}>
            <span className='min-w-0 flex-1 truncate font-medium text-fg'>
              {'#'}
              <Highlight text={option.tag.name} query={query} />
            </span>
            <span className='text-xs text-fg-subtle tabular-nums'>{count}</span>
          </div>
        );
      }
      case 'mention': {
        const { user } = option;
        const label = [
          user.displayName,
          `@${user.username}`,
          user.following ? t('following') : null,
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <div key={option.key} {...optionProps(index, label)}>
            <Avatar className='size-8'>
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt='' /> : null}
              <AvatarFallback className='text-xs'>{initialsOf(user.displayName)}</AvatarFallback>
            </Avatar>
            <span className='flex min-w-0 flex-1 flex-col'>
              <span className='truncate font-semibold text-fg'>
                <Highlight text={user.displayName} query={query} />
              </span>
              <span className='truncate text-xs text-fg-subtle'>
                {'@'}
                <Highlight text={user.username} query={query} />
              </span>
            </span>
            {user.following ? (
              <span className='text-xs text-fg-subtle'>{t('following')}</span>
            ) : null}
          </div>
        );
      }
    }
  };

  const emptyText = (): string => {
    if (kind === 'cashtag')
      return view.state === 'empty' && view.isDefault
        ? t('empty.stockDefault')
        : t('empty.stock', { query });
    if (kind === 'hashtag') return t('empty.tag', { query });
    return t('empty.user', { query });
  };

  return (
    <div
      ref={ref}
      style={style}
      data-testid='ac-popup'
      data-variant={variant}
      className={cn(
        'z-50 overflow-hidden bg-bg-elevated text-fg',
        variant === 'popover'
          ? 'absolute top-0 left-0 w-80 max-w-[calc(100vw-1rem)] rounded-lg border border-border shadow-md'
          : 'w-full border-y border-border'
      )}
    >
      <div className='relative'>
        {view.state === 'options' && view.refreshing ? (
          <div
            aria-hidden='true'
            className='absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-accent-subtle'
          >
            <div className='h-full w-1/3 bg-accent motion-safe:animate-pulse' />
          </div>
        ) : null}
        <div role='presentation' className='px-3 pt-2 pb-1 text-xs text-fg-subtle'>
          {t(`heading.${heading}`)}
        </div>
      </div>
      {view.state === 'loading' ? (
        <div aria-hidden='true' data-testid='ac-skeleton' className='flex flex-col'>
          {[0, 1, 2].map(row => (
            <div key={row} className='flex min-h-12 items-center gap-3 px-3'>
              <Skeleton className='size-6 rounded-sm' />
              <Skeleton className='h-3 flex-1' />
            </div>
          ))}
        </div>
      ) : null}
      {view.state === 'empty' ? (
        <p className='px-3 pt-1 pb-3 text-sm text-fg-muted'>{emptyText()}</p>
      ) : null}
      {view.state === 'error' ? (
        <p className='px-3 pt-1 text-sm text-fg-muted'>{t('error')}</p>
      ) : null}
      <div
        id={listboxId}
        role='listbox'
        aria-label={t(`listbox.${LISTBOX_LABEL[kind]}`)}
        onMouseDown={keepFocus}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className={cn(
          'overflow-y-auto overscroll-contain',
          // md+: en fazla 6 öğe; mobil: 4,5 öğe = 252 px (kaydırma ipucu)
          variant === 'popover' ? 'max-h-72' : 'max-h-63'
        )}
      >
        {view.state === 'options' ? view.options.map(renderOption) : null}
        {view.state === 'error' ? (
          <div {...optionProps(0, tCommon('retry'))}>
            <span className='font-medium text-accent'>{tCommon('retry')}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
