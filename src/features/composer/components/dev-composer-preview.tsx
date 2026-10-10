'use client';

import { useTranslations } from 'next-intl';
import { AlertDialog } from 'radix-ui';
import { type ReactElement, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ErrorCode, fail, ok } from '@/lib/errors';

import { createHttpComposerServices } from '../services/http';
import { createMockComposerServices } from '../services/mock';
import type { ComposerServices, SubmitResult } from '../types';

import type { ComposerHandle } from './composer';
import { ComposerGate, ComposerLazy, type ComposerViewer } from './composer-lazy';
import { DEV_OUTCOMES, type DevComposerConfig, type DevOutcome } from './dev-composer-params';

const DEV_USER_ID = 42;

const OUTCOME_RESULT: Readonly<Record<Exclude<DevOutcome, 'network'>, () => SubmitResult>> = {
  ok: () => ok({ id: 101 }),
  internal: () => fail(ErrorCode.INTERNAL),
  rateLimited: () => fail(ErrorCode.RATE_LIMITED, { retryAfter: 30 }),
  unauthenticated: () => fail(ErrorCode.UNAUTHENTICATED),
  restricted: () => fail(ErrorCode.ACCOUNT_SUSPENDED),
  unknownCashtag: () => fail(ErrorCode.UNKNOWN_CASHTAG, { tickers: ['ZZZZ'] }),
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Geçici geliştirme önizlemesi: composer'ın her varyantı sahte servislerle. Gönderme sonucu ve
 * gecikme sayfadan seçilir (S10 action'ları gelene kadar SND-* durumlarını görmek için).
 */
export const DevComposerPreview = ({
  config,
  sessionUserId = null,
}: {
  config: DevComposerConfig;
  /** `auth=session`: sunucuda çözülmüş gerçek oturumun kullanıcısı (anonimse null). */
  sessionUserId?: number | null;
}): ReactElement => {
  const t = useTranslations('devComposer');
  const tComposer = useTranslations('composer');
  const tShell = useTranslations('shell');
  const tCommon = useTranslations('common');
  const outcomeId = useId();
  const delayId = useId();
  const [outcome, setOutcome] = useState<DevOutcome>(config.outcome);
  const [delayMs, setDelayMs] = useState(config.delayMs);
  const [calls, setCalls] = useState(0);
  const [lastPayload, setLastPayload] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);
  const handle = useRef<ComposerHandle | null>(null);

  const services = useMemo<ComposerServices>(
    () =>
      config.services === 'http' ? createHttpComposerServices() : createMockComposerServices(),
    [config.services]
  );

  const settings = useRef({ outcome, delayMs });
  useLayoutEffect(() => {
    settings.current = { outcome, delayMs };
  }, [outcome, delayMs]);

  const respond = async (payload: object): Promise<SubmitResult> => {
    setCalls(count => count + 1);
    setLastPayload(JSON.stringify(payload));
    const current = settings.current;
    await sleep(current.delayMs);
    if (current.outcome === 'network') throw new TypeError('Failed to fetch');
    return OUTCOME_RESULT[current.outcome]();
  };

  const viewerOf = (): ComposerViewer => {
    if (config.auth === 'session') {
      return sessionUserId === null
        ? { status: 'anonymous' }
        : { status: 'authenticated', userId: sessionUserId };
    }
    return config.auth === 'authenticated'
      ? { status: 'authenticated', userId: DEV_USER_ID }
      : { status: config.auth };
  };
  const viewer = viewerOf();

  const requestDialogClose = (): void => {
    if (handle.current?.hasContent()) setConfirmOpen(true);
    else setDialogOpen(false);
  };

  const composer = (userId: number): ReactElement => {
    switch (config.variant) {
      case 'comment':
        return (
          <ComposerLazy
            key={config.postId}
            mode='comment'
            postId={config.postId}
            replyToUsername='aysek'
            draftOwnerId={userId}
            services={services}
            onSubmit={respond}
          />
        );
      case 'sheet':
        return sheetOpen ? (
          <ComposerLazy
            mode='post'
            layout='sheet'
            autoFocus
            draftOwnerId={userId}
            services={services}
            onSubmit={respond}
            onClose={() => setSheetOpen(false)}
            onSubmitted={() => setSheetOpen(false)}
          />
        ) : (
          <Button type='button' onClick={() => setSheetOpen(true)}>
            {t('openSheet')}
          </Button>
        );
      case 'dialog':
        return (
          <Dialog
            open={dialogOpen}
            onOpenChange={open => (open ? setDialogOpen(true) : requestDialogClose())}
          >
            <DialogTrigger asChild>
              <Button type='button'>{tShell('composeCta')}</Button>
            </DialogTrigger>
            <DialogContent
              closeLabel={tCommon('close')}
              className='sm:max-w-[600px]'
              // Esc önce açık autocomplete'i kapatır ([CMP-09]); editör olayı kendisi işler
              onEscapeKeyDown={event => {
                if (!handle.current?.isAutocompleteOpen()) return;
                event.preventDefault();
                handle.current.closeAutocomplete();
              }}
            >
              <DialogTitle>{tComposer('title')}</DialogTitle>
              <ComposerLazy
                mode='post'
                layout='dialog'
                autoFocus
                draftOwnerId={userId}
                services={services}
                onSubmit={respond}
                handleRef={handle}
                onSubmitted={() => setDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        );
      case 'inline':
        return (
          <ComposerLazy
            mode='post'
            layout='inline'
            draftOwnerId={userId}
            services={services}
            onSubmit={respond}
          />
        );
    }
  };

  return (
    <div className='flex flex-col gap-4 px-4 py-6'>
      {config.variant === 'sheet' ? null : (
        <header className='flex flex-col gap-1'>
          <h1 className='text-lg font-semibold'>{t('title')}</h1>
          <p className='text-sm text-fg-muted'>{t('intro')}</p>
        </header>
      )}

      <ComposerGate viewer={viewer} mode={config.variant === 'comment' ? 'comment' : 'post'}>
        {composer}
      </ComposerGate>

      <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className='fixed inset-0 z-60 bg-overlay/50' />
          <AlertDialog.Content className='fixed top-1/2 left-1/2 z-60 flex w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-lg border border-border bg-bg-elevated p-6 sm:max-w-sm'>
            <AlertDialog.Title className='text-md font-semibold'>
              {tComposer('draft.confirmTitle')}
            </AlertDialog.Title>
            <AlertDialog.Description className='text-sm text-fg-muted'>
              {tComposer('draft.confirmBody')}
            </AlertDialog.Description>
            <div className='flex flex-wrap justify-end gap-2'>
              <AlertDialog.Action asChild>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => {
                    handle.current?.discardDraft();
                    setDialogOpen(false);
                  }}
                >
                  {tComposer('draft.delete')}
                </Button>
              </AlertDialog.Action>
              <AlertDialog.Action asChild>
                <Button
                  type='button'
                  onClick={() => {
                    handle.current?.saveDraft();
                    setDialogOpen(false);
                  }}
                >
                  {tComposer('draft.save')}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <section
        aria-label={t('outcome')}
        className='flex flex-col gap-3 rounded-md border border-dashed border-border p-3 text-sm'
      >
        <div className='flex flex-wrap items-center gap-3'>
          <label htmlFor={outcomeId}>{t('outcome')}</label>
          <select
            id={outcomeId}
            value={outcome}
            onChange={event => {
              const next = DEV_OUTCOMES.find(value => value === event.target.value);
              if (next) setOutcome(next);
            }}
            className='min-h-hit rounded-md border border-border-strong bg-bg px-2'
          >
            {DEV_OUTCOMES.map(value => (
              <option key={value} value={value}>
                {t(`outcomes.${value}`)}
              </option>
            ))}
          </select>
          <label htmlFor={delayId}>{t('delay')}</label>
          <input
            id={delayId}
            type='number'
            min={0}
            max={10_000}
            value={delayMs}
            onChange={event => setDelayMs(Math.max(0, Number(event.target.value) || 0))}
            className='min-h-hit w-24 rounded-md border border-border-strong bg-bg px-2'
          />
        </div>
        <p data-testid='dev-calls'>{t('calls', { count: calls })}</p>
        <div className='flex flex-col gap-1'>
          <span className='text-fg-muted'>{t('lastPayload')}</span>
          <pre data-testid='dev-payload' className='text-xs break-all whitespace-pre-wrap'>
            {lastPayload}
          </pre>
        </div>
      </section>
    </div>
  );
};
