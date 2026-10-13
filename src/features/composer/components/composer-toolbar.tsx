'use client';

import { AtSign, DollarSign, Hash } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, type ReactElement, type ReactNode, useRef, useState } from 'react';

import type { TriggerKind } from '@/lib/entities';
import { cn } from '@/lib/utils';

const BUTTONS: readonly {
  kind: TriggerKind;
  icon: typeof DollarSign;
  label: 'cashtag' | 'hashtag' | 'mention';
}[] = [
  { kind: 'cashtag', icon: DollarSign, label: 'cashtag' },
  { kind: 'hashtag', icon: Hash, label: 'hashtag' },
  { kind: 'mention', icon: AtSign, label: 'mention' },
];

type ComposerToolbarProps = {
  onInsertTrigger: (kind: TriggerKind) => void;
  disabled?: boolean;
  /** Toolbar'ın sağı: sayaç ve gönder butonu */
  children?: ReactNode;
  className?: string;
};

/**
 * `$ # @` butonları (tasarım §1.2): Türkçe Q klavyede `$` AltGr+4, mobilde ikinci sembol
 * sayfasında; cashtag tek dokunuşla erişilebilir olmalı. Görsel/GIF butonları M1'de yok (K10).
 * `role="toolbar"`: tek tab durağı, ok tuşlarıyla gezinme (roving tabindex).
 */
export const ComposerToolbar = ({
  onInsertTrigger,
  disabled = false,
  children,
  className,
}: ComposerToolbarProps): ReactElement => {
  const t = useTranslations('composer.toolbar');
  const [focusIndex, setFocusIndex] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const jump = event.key === 'Home' ? 0 : event.key === 'End' ? BUTTONS.length - 1 : null;
    if (delta === 0 && jump === null) return;
    event.preventDefault();
    const next = jump ?? (focusIndex + delta + BUTTONS.length) % BUTTONS.length;
    setFocusIndex(next);
    refs.current[next]?.focus();
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div
        role='toolbar'
        aria-label={t('label')}
        aria-orientation='horizontal'
        onKeyDown={handleKeyDown}
        className='flex items-center gap-1'
      >
        {BUTTONS.map(({ kind, icon: Icon, label }, index) => (
          <button
            key={kind}
            ref={node => {
              refs.current[index] = node;
            }}
            type='button'
            tabIndex={index === focusIndex ? 0 : -1}
            aria-label={t(label)}
            disabled={disabled}
            // Editör seçimini (imleç konumu) korur
            onMouseDown={event => event.preventDefault()}
            onClick={() => {
              setFocusIndex(index);
              onInsertTrigger(kind);
            }}
            className='inline-flex size-hit items-center justify-center rounded-md text-accent hover:bg-bg-muted disabled:opacity-60'
          >
            <Icon aria-hidden='true' className='size-5' />
          </button>
        ))}
      </div>
      <div className='ml-auto flex flex-wrap items-center justify-end gap-3'>{children}</div>
    </div>
  );
};
