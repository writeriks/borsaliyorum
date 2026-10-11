'use client';

import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import { TextSelection } from '@tiptap/pm/state';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  type FocusEvent,
  type ReactElement,
  type Ref,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { InvestmentDisclaimer } from '@/components/legal/investment-disclaimer';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link, useRouter } from '@/i18n/navigation';
import type { TriggerKind } from '@/lib/entities';
import { SIGNED_OUT_EVENT } from '@/lib/auth-events';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

import {
  type AutocompleteBridge,
  type AutocompleteSession,
  exitAutocomplete,
} from '../editor/autocomplete';
import { getDocText } from '../editor/doc-text';
import { entityDecorationsKey } from '../editor/entity-decorations';
import { ComposerEditorContent, textToDoc, useComposerEditor } from '../editor/use-composer-editor';
import { useAutocompleteData, useStockIndex } from '../hooks/use-autocomplete-data';
import { useDelayedFlag, useIsDesktop, useVisualViewport } from '../hooks/use-browser';
import {
  analyzeContent,
  getSubmitBlocker,
  isSentimentAvailable,
  type SubmitBlocker,
} from '../lib/content-rules';
import { clearDraft, type Draft, draftKey, loadDraft, saveDraft } from '../lib/draft-storage';
import { computeSelectionReplacement, computeTriggerInsertion } from '../lib/insertion';
import { CHAR_LIMITS } from '../lib/limits';
import { type ClientRequest, mapSubmitError, resolveClientRequest } from '../lib/submit';
import { findExactStock } from '../lib/stock-search';
import type {
  CommentSubmitHandler,
  ComposerLayout,
  ComposerServices,
  PostSubmitHandler,
  Sentiment,
  SubmitErrorKind,
  SubmitResult,
} from '../types';

import { type AcView, AutocompleteList } from './autocomplete-list';
import { CharCounter } from './char-counter';
import { ComposerToolbar } from './composer-toolbar';
import { LinkPreviewSlot } from './link-preview-slot';
import { SentimentPicker } from './sentiment-picker';
import { SponsoredPreview, SponsoredSwitch } from './sponsored-switch';

import './composer.css';

/** Dialog/sheet kabuğunun composer'a eriştiği yüzey (Esc sırası, kapatırken taslak sorusu). */
export type ComposerHandle = {
  isAutocompleteOpen: () => boolean;
  /** Dialog Esc'i kendisi yakaladığında (Radix, capture fazı) listeyi kapatmak için. */
  closeAutocomplete: () => void;
  hasContent: () => boolean;
  saveDraft: () => void;
  discardDraft: () => void;
  focus: () => void;
};

type CommonProps = {
  /** DB'deki sayısal kullanıcı kimliği: taslak anahtarı (Firebase uid değil). */
  draftOwnerId: number;
  services: ComposerServices;
  layout?: ComposerLayout;
  autoFocus?: boolean;
  className?: string;
  /** Oturum düşünce gösterilen "Giriş yap" hedefi. */
  loginHref?: string;
  onSubmitted?: (id: number) => void;
  /** Yalnızca `sheet`: üst bardaki kapat. */
  onClose?: () => void;
  handleRef?: Ref<ComposerHandle>;
};

export type ComposerProps =
  | (CommonProps & { mode: 'post'; onSubmit: PostSubmitHandler })
  | (CommonProps & {
      mode: 'comment';
      postId: number;
      replyToUsername?: string;
      onSubmit: CommentSubmitHandler;
    });

type SubmitState = 'idle' | 'submitting';

const DRAFT_SAVE_DELAY_MS = 500;
const AC_ANNOUNCE_DELAY_MS = 500;
const AC_SKELETON_DELAY_MS = 300;

export const Composer = (props: ComposerProps): ReactElement => {
  const { mode, services, draftOwnerId, layout = 'inline', autoFocus = false, className } = props;
  const t = useTranslations('composer');
  const tAc = useTranslations('ac');
  const tErrors = useTranslations('errors');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const viewport = useVisualViewport(layout === 'sheet');
  const baseId = useId();
  const ids = {
    counter: `${baseId}-counter`,
    disclaimer: `${baseId}-disclaimer`,
    listbox: `${baseId}-listbox`,
    sponsoredBlocked: `${baseId}-sponsored-blocked`,
    unknown: `${baseId}-unknown`,
  };
  const optionId = useCallback((index: number) => `${baseId}-opt-${index}`, [baseId]);

  const storageKey = draftKey(
    draftOwnerId,
    mode === 'post' ? { kind: 'post' } : { kind: 'comment', postId: props.postId }
  );
  const [initialDraft] = useState<Draft | null>(() => loadDraft(storageKey));
  const [restoredNotice, setRestoredNotice] = useState(initialDraft !== null);

  const [text, setText] = useState(initialDraft?.text ?? '');
  const [sentiment, setSentiment] = useState<Sentiment>(initialDraft?.sentiment ?? 'neutral');
  const [isSponsored, setIsSponsored] = useState(
    mode === 'post' ? (initialDraft?.isSponsored ?? false) : false
  );
  const [previewDismissed, setPreviewDismissed] = useState(initialDraft?.previewDismissed ?? false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitError, setSubmitError] = useState<SubmitErrorKind | null>(null);
  const [restricted, setRestricted] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [editorFocused, setEditorFocused] = useState(false);

  const [session, setSession] = useState<AutocompleteSession | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [knownUsernames, setKnownUsernames] = useState<ReadonlySet<string>>(() => new Set());

  const stocks = useStockIndex(services);
  const index = stocks.index;
  const limit = CHAR_LIMITS[mode];

  const pendingCashtagStart = session?.kind === 'cashtag' ? session.textStart : null;
  const analysis = useMemo(
    () => analyzeContent(text, mode, index?.tickers ?? null, pendingCashtagStart),
    [text, mode, index, pendingCashtagStart]
  );
  const sentimentAvailable = isSentimentAvailable(mode, analysis);
  // Cashtag silinip seçici gizlenince seçim Nötr'e döner (tasarım §1.5). İndeks yüklenmeden
  // hiçbir cashtag tanınmış görünmez: o ana kadar sıfırlanırsa geri yüklenen taslağın görüşü kaybolur
  if (index !== null && !sentimentAvailable && sentiment !== 'neutral') setSentiment('neutral');

  const blocker: SubmitBlocker | null = getSubmitBlocker({
    analysis,
    mode,
    isSponsored,
    indexReady: index !== null,
    submitting: submitState === 'submitting',
    restricted,
  });

  // --- Autocomplete köprüsü (editör eklentisi ↔ React) ---
  const keyHandler = useRef<(event: KeyboardEvent) => boolean>(() => false);
  const indexRef = useRef(index);
  useLayoutEffect(() => {
    indexRef.current = index;
  }, [index]);
  const [bridge] = useState<AutocompleteBridge>(() => ({
    onChange: next =>
      setSession(previous => {
        if (previous?.kind !== next.kind || previous.query !== next.query) setActiveIndex(0);
        return next;
      }),
    onClose: kind => setSession(previous => (previous?.kind === kind ? null : previous)),
    onKeyDown: event => keyHandler.current(event),
    resolveTicker: query => {
      const current = indexRef.current;
      return current ? (findExactStock(current, query)?.t ?? null) : null;
    },
  }));

  const submitRef = useRef<() => void>(() => undefined);
  const editor = useComposerEditor({
    initialText: initialDraft?.text ?? '',
    placeholder: t(mode === 'post' ? 'placeholder.post' : 'placeholder.comment'),
    limit,
    bridge,
    onSubmitShortcut: () => submitRef.current(),
    onTextChange: instance => setText(getDocText(instance.state.doc)),
    onFocusChange: setEditorFocused,
  });

  // Görülen kullanıcı adları editörde "çözülmüş mention" olarak vurgulanır
  const rememberUsernames = useCallback((users: readonly { username: string }[]): void => {
    setKnownUsernames(previous => {
      const additions = users
        .map(user => user.username.toLowerCase())
        .filter(name => !previous.has(name));
      return additions.length === 0 ? previous : new Set([...previous, ...additions]);
    });
  }, []);
  const ac = useAutocompleteData({
    services,
    kind: session?.kind ?? null,
    query: session?.query ?? '',
    stocks,
    onUsersLoaded: rememberUsernames,
  });
  const popupOpen = session !== null && editorFocused && submitState === 'idle';
  const selectableCount = ac.isError ? 1 : ac.options.length;
  const active = Math.min(activeIndex, Math.max(0, selectableCount - 1));
  const showSkeleton = useDelayedFlag(popupOpen && ac.isPending, AC_SKELETON_DELAY_MS);
  const acView: AcView = ac.isError
    ? { state: 'error' }
    : ac.isPending
      ? showSkeleton
        ? { state: 'loading' }
        : { state: 'options', options: [], refreshing: false }
      : ac.options.length === 0
        ? { state: 'empty', isDefault: ac.isDefaultEmpty }
        : { state: 'options', options: ac.options, refreshing: ac.isRefreshing };

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.view.dispatch(
      editor.state.tr.setMeta(entityDecorationsKey, {
        tickers: index?.tickers ?? null,
        knownUsernames,
        limit,
        pendingCashtagStart,
      })
    );
  }, [editor, index, knownUsernames, limit, pendingCashtagStart]);

  const selectOption = useCallback(
    (optionIndex: number): void => {
      if (!editor || !session) return;
      if (ac.isError) {
        ac.retry();
        return;
      }
      const option = ac.options[optionIndex];
      if (!option) return;
      const $from = editor.state.doc.resolve(session.from);
      const paragraphStart = $from.start();
      const replacement = computeSelectionReplacement({
        paragraphText: $from.parent.textContent,
        triggerStart: session.from - paragraphStart,
        caret: session.to - paragraphStart,
        kind: option.kind,
        value: option.value,
      });
      const tr = editor.state.tr.insertText(
        replacement.text,
        paragraphStart + replacement.from,
        paragraphStart + replacement.to
      );
      tr.setSelection(TextSelection.create(tr.doc, paragraphStart + replacement.caret));
      editor.view.dispatch(tr);
      editor.commands.focus();
      if (option.kind === 'mention') {
        setKnownUsernames(previous => new Set([...previous, option.value.toLowerCase()]));
      }
    },
    [editor, session, ac]
  );

  useLayoutEffect(() => {
    keyHandler.current = (event: KeyboardEvent): boolean => {
      if (!popupOpen || selectableCount === 0) return false;
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return false;
      switch (event.key) {
        case 'ArrowDown':
          setActiveIndex((active + 1) % selectableCount);
          return true;
        case 'ArrowUp':
          setActiveIndex((active - 1 + selectableCount) % selectableCount);
          return true;
        case 'Enter':
        case 'Tab':
          if (event.shiftKey) return false;
          selectOption(active);
          return true;
        default:
          return false;
      }
    };
  });

  // --- ARIA: combobox (çok satırlı metin alanı varyantı, tasarım §2.5) ---
  const label = t(mode === 'post' ? 'label.post' : 'label.comment');
  const disclaimerVisible = mode === 'post' || focusWithin || !analysis.isBlank;
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const describedBy = [ids.counter, disclaimerVisible ? ids.disclaimer : null]
      .filter(Boolean)
      .join(' ');
    const activeDescendant =
      popupOpen && selectableCount > 0 && acView.state !== 'loading' ? optionId(active) : null;
    const attributes: Record<string, string> = {
      class: cn(
        'cmp-editor text-md text-fg md:text-post',
        layout === 'inline' ? 'max-h-[50vh] overflow-y-auto' : '',
        layout === 'dialog' ? 'max-h-[50vh] min-h-24 overflow-y-auto' : ''
      ),
      'aria-label': label,
      'aria-multiline': 'true',
      'aria-autocomplete': 'list',
      'aria-haspopup': 'listbox',
      // `aria-expanded` yok: ARIA 1.2'de `textbox` rolünde geçersiz (axe aria-allowed-attr,
      // [AC-23]); `combobox` ise çok satırlı olamaz. Açık liste `aria-controls` ile bildirilir.
      'data-ac-open': popupOpen ? 'true' : 'false',
      'aria-describedby': describedBy,
    };
    if (popupOpen) attributes['aria-controls'] = ids.listbox;
    if (activeDescendant) attributes['aria-activedescendant'] = activeDescendant;
    if (blocker === 'unknownCashtag' || blocker === 'overLimit')
      attributes['aria-invalid'] = 'true';
    editor.setOptions({ editorProps: { attributes } });
  }, [
    editor,
    label,
    layout,
    popupOpen,
    active,
    selectableCount,
    acView.state,
    blocker,
    disclaimerVisible,
    ids.counter,
    ids.disclaimer,
    ids.listbox,
    optionId,
  ]);

  // --- Canlı bölge: öneri sayısı (500 ms debounce, yüklenirken duyuru yok) ---
  const [acAnnouncement, setAcAnnouncement] = useState('');
  const announceText = !popupOpen
    ? ''
    : acView.state === 'options' && acView.options.length > 0
      ? tAc('sr.count', { count: acView.options.length })
      : acView.state === 'empty'
        ? tAc('sr.none')
        : '';
  useEffect(() => {
    const timer = setTimeout(() => setAcAnnouncement(announceText), AC_ANNOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [announceText]);

  // --- Popover konumu (md+): `$` karakterinin altında, sol kenar hizalı (tasarım §2.6) ---
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const getRect = session?.getRect;
  useEffect(() => {
    const floating = popoverRef.current;
    if (!popupOpen || !isDesktop || !floating || !editor || !getRect) return;
    const reference = {
      getBoundingClientRect: () => getRect() ?? editor.view.dom.getBoundingClientRect(),
      contextElement: editor.view.dom,
    };
    // İlk konum hesaplanana kadar gizli: (0, 0)'da bir kare görünmesin
    if (!floating.style.left) floating.style.visibility = 'hidden';
    return autoUpdate(reference, floating, () => {
      void computePosition(reference, floating, {
        strategy: 'absolute',
        placement: 'bottom-start',
        middleware: [offset(4), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        Object.assign(floating.style, { left: `${x}px`, top: `${y}px`, visibility: '' });
      });
    });
  }, [popupOpen, isDesktop, editor, getRect, session?.query]);

  // --- Taslak ---
  const draftRef = useRef<Draft>({ text, sentiment, isSponsored, previewDismissed });
  useLayoutEffect(() => {
    draftRef.current = { text, sentiment, isSponsored, previewDismissed };
  });
  // Çıkıştan sonra hiçbir yol (gecikmeli kayıt, sekme gizlenince kayıt) taslağı geri yazmaz:
  // S5 çıkışta sayfadan ayrılır ve `visibilitychange` temizlenmiş taslağı yeniden yazardı
  const signedOut = useRef(false);
  useEffect(() => {
    const onSignedOut = (): void => {
      signedOut.current = true;
    };
    window.addEventListener(SIGNED_OUT_EVENT, onSignedOut);
    return () => window.removeEventListener(SIGNED_OUT_EVENT, onSignedOut);
  }, []);
  const persistDraft = useCallback(
    (draft: Draft): void => {
      if (!signedOut.current) saveDraft(storageKey, draft);
    },
    [storageKey]
  );
  useEffect(() => {
    const timer = setTimeout(
      () => persistDraft({ text, sentiment, isSponsored, previewDismissed }),
      DRAFT_SAVE_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, [persistDraft, text, sentiment, isSponsored, previewDismissed]);
  useEffect(() => {
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') persistDraft(draftRef.current);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [persistDraft]);

  const resetComposer = useCallback((): void => {
    editor?.commands.setContent(textToDoc(''));
    setText('');
    setSentiment('neutral');
    setIsSponsored(false);
    setPreviewDismissed(false);
    setRestoredNotice(false);
    clearDraft(storageKey);
  }, [editor, storageKey]);

  // --- Gönderme ---
  const inFlight = useRef(false);
  const requestRef = useRef<ClientRequest | null>(null);

  useEffect(() => {
    if (submitState !== 'submitting') return;
    // Gönderme sürerken sekme kapanırsa tarayıcının yerel uyarısı (tasarım §1.8)
    const onBeforeUnload = (event: BeforeUnloadEvent): void => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [submitState]);

  const submit = async (): Promise<void> => {
    if (inFlight.current || !editor) return;
    // Hızlı klavye (yaz + Ctrl+Enter) React state'i güncellenmeden gelebilir: kurallar editörün
    // o anki metniyle yeniden değerlendirilir
    const currentText = getDocText(editor.state.doc);
    const current = analyzeContent(currentText, mode, index?.tickers ?? null);
    const currentBlocker = getSubmitBlocker({
      analysis: current,
      mode,
      isSponsored,
      indexReady: index !== null,
      submitting: false,
      restricted,
    });
    if (currentBlocker !== null) return;
    inFlight.current = true;
    setSubmitState('submitting');
    setSubmitError(null);
    editor.setEditable(false, false);
    const currentSentiment = isSentimentAvailable(mode, current) ? sentiment : 'neutral';
    const currentPreviewUrl = previewDismissed ? null : current.firstUrl;
    const currentSponsored = mode === 'post' && isSponsored;
    requestRef.current = resolveClientRequest(requestRef.current, {
      text: currentText,
      sentiment: currentSentiment,
      isSponsored: currentSponsored,
      previewUrl: mode === 'post' ? currentPreviewUrl : null,
    });
    const clientRequestId = requestRef.current.id;

    let result: SubmitResult | null = null;
    try {
      result =
        props.mode === 'post'
          ? await props.onSubmit({
              text: currentText,
              sentiment: currentSentiment,
              isSponsored: currentSponsored,
              previewUrl: currentPreviewUrl,
              clientRequestId,
            })
          : await props.onSubmit({ postId: props.postId, text: currentText, clientRequestId });
    } catch (error) {
      logger.warn('composer submit failed', { err: error, mode });
    } finally {
      inFlight.current = false;
      editor.setEditable(true, false);
      setSubmitState('idle');
    }

    if (result?.ok) {
      requestRef.current = null;
      resetComposer();
      const id = result.data.id;
      if (mode === 'post') {
        toast(t('success.post'), {
          action: { label: t('success.view'), onClick: () => router.push(`/gonderi/${id}`) },
        });
      } else {
        toast(t('success.comment'));
      }
      props.onSubmitted?.(id);
      if (layout === 'inline') editor.commands.focus();
      return;
    }

    const mapped = mapSubmitError(result);
    if (mapped.kind === 'session') persistDraft(draftRef.current);
    if (mapped.kind === 'restricted') setRestricted(true);
    // Sunucu bu kimlikle başka bir yük kaydetmiş: aynı kimlikle yeniden denemek hep CONFLICT
    // döner, otomatik yeni kimlikle denemek ise döngü olur. Kullanıcı bir sonraki Paylaş'ta
    // (bilinçli eylem) yeni kimlikle gönderir.
    if (mapped.kind === 'conflict') requestRef.current = null;
    setSubmitError(mapped);
  };
  useLayoutEffect(() => {
    submitRef.current = () => void submit();
  });

  useImperativeHandle(
    props.handleRef,
    (): ComposerHandle => ({
      isAutocompleteOpen: () => popupOpen,
      closeAutocomplete: () => {
        if (editor && session) exitAutocomplete(editor.view);
      },
      hasContent: () => !analysis.isBlank,
      saveDraft: () => persistDraft(draftRef.current),
      discardDraft: resetComposer,
      focus: () => editor?.commands.focus(),
    }),
    [popupOpen, session, analysis.isBlank, persistDraft, resetComposer, editor]
  );

  const insertTrigger = (kind: TriggerKind): void => {
    if (!editor) return;
    const { $from } = editor.state.selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
    editor
      .chain()
      .focus()
      .insertContent({ type: 'text', text: computeTriggerInsertion(textBefore, kind) })
      .run();
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>): void => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
  };

  const expanded =
    layout !== 'inline' ||
    focusWithin ||
    !analysis.isBlank ||
    submitState !== 'idle' ||
    submitError !== null ||
    restoredNotice;
  const isSubmitting = submitState === 'submitting';
  const showPanel = popupOpen && !isDesktop;

  const submitLabel = isSubmitting
    ? t('submitting')
    : t(mode === 'post' ? 'submit.post' : 'submit.comment');
  const submitDescribedBy =
    blocker === 'sponsoredCashtag'
      ? ids.sponsoredBlocked
      : blocker === 'unknownCashtag'
        ? ids.unknown
        : undefined;
  const submitButton = (
    <Button
      type='button'
      size='lg'
      loading={isSubmitting}
      aria-disabled={blocker !== null && !isSubmitting ? true : undefined}
      aria-describedby={submitDescribedBy}
      onClick={() => void submit()}
      data-testid='composer-submit'
    >
      {submitLabel}
    </Button>
  );
  const submitControl =
    blocker === 'empty' ? (
      <Tooltip>
        <TooltipTrigger asChild>{submitButton}</TooltipTrigger>
        <TooltipContent>{t('disabled.empty')}</TooltipContent>
      </Tooltip>
    ) : (
      submitButton
    );

  const autocomplete =
    popupOpen && session ? (
      <AutocompleteList
        ref={showPanel ? undefined : popoverRef}
        variant={showPanel ? 'panel' : 'popover'}
        kind={session.kind}
        query={session.query}
        heading={ac.heading}
        view={acView}
        activeIndex={active}
        listboxId={ids.listbox}
        optionId={optionId}
        onSelect={selectOption}
        onHover={setActiveIndex}
      />
    ) : null;

  const errorBand = submitError ? (
    <div
      role='alert'
      data-testid='composer-error'
      className='flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-danger-bg px-3 py-2 text-sm text-fg'
    >
      <span>{errorMessage(submitError, t, tErrors)}</span>
      {submitError.kind === 'generic' ? (
        <Button type='button' variant='ghost' size='md' onClick={() => void submit()}>
          {tCommon('retry')}
        </Button>
      ) : null}
      {submitError.kind === 'session' ? (
        <Button asChild variant='outline' size='md'>
          <Link href={props.loginHref ?? '/giris'}>{tCommon('login')}</Link>
        </Button>
      ) : null}
    </div>
  ) : null;

  const counter = <CharCounter id={ids.counter} count={analysis.count} limit={limit} />;
  const disclaimer = disclaimerVisible ? (
    <InvestmentDisclaimer id={ids.disclaimer} variant={mode === 'post' ? 'short' : 'comment'} />
  ) : null;

  const middleRows =
    mode === 'post' ? (
      <>
        {sentimentAvailable ? (
          <SentimentPicker value={sentiment} onChange={setSentiment} disabled={isSubmitting} />
        ) : null}
        <SponsoredSwitch
          checked={isSponsored}
          onCheckedChange={setIsSponsored}
          disabled={isSubmitting}
        />
        {blocker === 'sponsoredCashtag' ? (
          <p id={ids.sponsoredBlocked} className='text-sm text-danger'>
            {t('sponsored.cashtagBlocked')}
          </p>
        ) : null}
      </>
    ) : null;

  const isSheet = layout === 'sheet';

  return (
    <div
      ref={rootRef}
      data-testid='composer'
      data-layout={layout}
      data-mode={mode}
      data-expanded={expanded ? 'true' : 'false'}
      onFocus={() => setFocusWithin(true)}
      onBlur={handleBlur}
      onKeyDown={event => {
        // Ctrl/Cmd+Enter composer içindeki her denetimden gönderir ([A11Y-02]); editör kendisi işler
        if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
        // Editör kısayolu işlediyse (`preventDefault`) tekrar gönderme. Radix radio Enter'ı da
        // `preventDefault` eder, bu yüzden kontrol yalnızca editör hedefi için. Android Chrome'da
        // ProseMirror Enter'ı keydown'da işlemez (beforeinput): orada da buradan gönderilir.
        const inEditor = event.target instanceof Node && editor?.view.dom.contains(event.target);
        if (inEditor && event.defaultPrevented) return;
        event.preventDefault();
        void submit();
      }}
      style={
        isSheet && viewport
          ? { height: `${viewport.height}px`, transform: `translateY(${viewport.offsetTop}px)` }
          : undefined
      }
      className={cn(
        'relative flex flex-col text-fg',
        expanded ? 'gap-2' : 'gap-1',
        layout === 'inline' && 'rounded-lg border border-border bg-bg-subtle p-3',
        isSheet && 'fixed inset-x-0 top-0 z-40 h-dvh bg-bg',
        className
      )}
    >
      {isSheet ? (
        <div className='flex h-topbar shrink-0 items-center gap-2 border-b border-border px-2'>
          <button
            type='button'
            aria-label={tCommon('close')}
            onClick={props.onClose}
            className='inline-flex size-hit items-center justify-center rounded-md text-fg-muted hover:bg-bg-muted'
          >
            <X aria-hidden='true' className='size-5' />
          </button>
          <h2 className='flex-1 text-md font-semibold'>{t('title')}</h2>
          {submitControl}
        </div>
      ) : null}

      <div
        className={cn('flex flex-col gap-2', isSheet && 'min-h-0 flex-1 overflow-y-auto px-4 pt-3')}
      >
        {props.mode === 'comment' && props.replyToUsername && expanded ? (
          <p className='text-xs text-fg-subtle'>
            {t('replyingTo', { username: props.replyToUsername })}
          </p>
        ) : null}
        {mode === 'post' && isSponsored ? <SponsoredPreview /> : null}
        <ComposerEditorContent
          editor={editor}
          autoFocus={autoFocus}
          className={cn(expanded && layout !== 'inline' && 'min-h-18')}
        />
        {editor ? null : <div aria-hidden='true' className='h-6' />}
        {blocker === 'unknownCashtag' ? (
          <p id={ids.unknown} className='text-sm text-danger'>
            {t('unknownCashtag', {
              tickers: analysis.unknownCashtags.map(ticker => `$${ticker}`).join(', '),
            })}
          </p>
        ) : null}
        {previewDismissed ? null : (
          <LinkPreviewSlot
            url={analysis.firstUrl}
            services={services}
            onDismiss={() => setPreviewDismissed(true)}
          />
        )}
        {restoredNotice ? (
          <p className='flex flex-wrap items-center gap-x-2 text-xs text-fg-muted'>
            {t('draft.restored')}
            <button
              type='button'
              onClick={() => {
                resetComposer();
                editor?.commands.focus();
              }}
              className='min-h-hit font-medium text-accent underline underline-offset-2'
            >
              {t('draft.discard')}
            </button>
          </p>
        ) : null}
        {errorBand}
      </div>

      {expanded ? (
        <div className={cn('flex flex-col', showPanel ? 'gap-0' : 'gap-2', isSheet && 'shrink-0')}>
          {showPanel ? (
            autocomplete
          ) : (
            <div className={cn('flex flex-col gap-2', isSheet && 'px-4')}>
              {middleRows}
              {isSheet ? disclaimer : null}
            </div>
          )}
          <ComposerToolbar
            onInsertTrigger={insertTrigger}
            disabled={isSubmitting}
            className={cn(
              isSheet && 'border-t border-border px-2 pb-[env(safe-area-inset-bottom)]'
            )}
          >
            {counter}
            {isSheet ? null : submitControl}
          </ComposerToolbar>
        </div>
      ) : (
        <span className='sr-only'>{counter}</span>
      )}
      {isSheet ? null : disclaimer}
      {showPanel ? null : autocomplete}
      <span role='status' aria-live='polite' className='sr-only' data-testid='ac-live'>
        {acAnnouncement}
      </span>
    </div>
  );
};

type Translator = ReturnType<typeof useTranslations<'composer'>>;
type ErrorTranslator = ReturnType<typeof useTranslations<'errors'>>;

const errorMessage = (error: SubmitErrorKind, t: Translator, tErrors: ErrorTranslator): string => {
  switch (error.kind) {
    case 'generic':
      return t('error.generic');
    case 'rateLimited':
      return t('error.rateLimit');
    case 'session':
      return t('error.session');
    case 'restricted':
      return t('error.restricted');
    case 'unverified':
      return tErrors('EMAIL_NOT_VERIFIED');
    case 'conflict':
      return t('error.conflict');
    case 'validation': {
      if (error.code === 'UNKNOWN_CASHTAG') {
        const tickers = error.meta?.tickers;
        const list = Array.isArray(tickers) ? tickers.map(ticker => `$${ticker}`).join(', ') : '';
        if (list) return t('unknownCashtag', { tickers: list });
      }
      return tErrors(error.code);
    }
  }
};
