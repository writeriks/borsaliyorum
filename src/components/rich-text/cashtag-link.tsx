'use client';

import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactElement, useEffect, useState, useSyncExternalStore } from 'react';

import { InvestmentDisclaimer } from '@/components/legal/investment-disclaimer';
import { Button } from '@/components/ui/button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, usePathname } from '@/i18n/navigation';

import { externalStockLinks, stockHref, TRUSTED_LINK_REL } from './entity-routes';
import { ENTITY_CLASS } from './entity-styles';
import { type StockCardStats, useStockCard } from './stock-card-context';
import type { StockSummary } from './types';

// Kart yalnızca gerçek fareli cihazda (tasarım §4): dokunmatikte dokunma doğrudan sayfaya gider.
const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

const subscribeFinePointer = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(FINE_POINTER_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

/** Sunucuda ve hidrasyonda `false`: kart yalnızca istemcide, fare varsa açılabilir. */
const useFinePointer = (): boolean =>
  useSyncExternalStore(
    subscribeFinePointer,
    () => window.matchMedia(FINE_POINTER_QUERY).matches,
    () => false
  );

const noopSubscribe = (): (() => void) => () => undefined;

/** Sunucuda ve hidrasyon karesinde `false`, hidrasyondan sonra `true` (olay dinleyicileri bağlı). */
const useHydrated = (): boolean =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

type StatsState = { status: 'loading' } | { status: 'error' } | ({ status: 'ok' } & StockCardStats);

const StatsLine = ({ ticker }: { ticker: string }): ReactElement | null => {
  const t = useTranslations('hovercard');
  const { getStats } = useStockCard();
  const [state, setState] = useState<StatsState>({ status: 'loading' });

  useEffect(() => {
    if (!getStats) return undefined;
    let active = true;
    getStats(ticker).then(
      stats => {
        if (active) setState({ status: 'ok', ...stats });
      },
      () => {
        // Sayaç ikincil bilgi: satır gizlenir, kartın geri kalanı çalışır ([HC-07]). Hata
        // yükleyicinin kendi katmanında loglanır; burada kullanıcıya teknik ayrıntı gösterilmez.
        if (active) setState({ status: 'error' });
      }
    );
    return () => {
      active = false;
    };
  }, [getStats, ticker]);

  if (!getStats || state.status === 'error') return null;
  if (state.status === 'loading') {
    return (
      <div aria-busy='true' className='flex h-4 items-center'>
        <span className='sr-only'>{t('statsLoading')}</span>
        <Skeleton className='h-3 w-40' />
      </div>
    );
  }
  return (
    <p className='text-xs text-fg-subtle tabular-nums'>
      {t('mentions24h', { count: state.mentions24h })}
    </p>
  );
};

const FollowSlot = (): ReactElement | null => {
  const t = useTranslations('hovercard');
  const { viewer } = useStockCard();
  // Girişten sonra kullanıcı bulunduğu sayfaya döner (auth-session UX kural 3). Locale öneksiz yol;
  // `next` değerinin kendi sitemize ait olduğu giriş sayfasında ayrıca doğrulanır.
  const pathname = usePathname();
  // Auth bilinmiyorken "Takip et" asla görünmez; aynı ölçüde skeleton ([HC-05], auth-session).
  if (viewer === 'unknown') {
    return (
      <div aria-busy='true' data-testid='follow-skeleton'>
        <span className='sr-only'>{t('followLoading')}</span>
        <Skeleton className='h-8 w-20' />
      </div>
    );
  }
  if (viewer === 'anonymous') {
    return (
      <Button asChild variant='outline' size='sm'>
        <Link href={{ pathname: '/giris', query: { next: pathname } }}>{t('follow')}</Link>
      </Button>
    );
  }
  // Takip aksiyonu S10'da bağlanır; o zamana kadar girişli kullanıcıya buton gösterilmez.
  return null;
};

const StockCardBody = ({ stock }: { stock: StockSummary }): ReactElement => {
  const t = useTranslations('hovercard');
  const external = externalStockLinks(stock);
  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex min-w-0 flex-col gap-0.5'>
          <p className='text-md font-semibold tabular-nums'>{stock.ticker}</p>
          <p className='text-sm text-fg-muted'>{stock.companyName}</p>
          <p className='text-xs text-fg-subtle'>{t(`market.${stock.stockType}`)}</p>
        </div>
        <FollowSlot />
      </div>
      <StatsLine ticker={stock.ticker} />
      <div className='flex flex-wrap gap-x-4 gap-y-1 text-sm'>
        <Link href={stockHref(stock.ticker)} className='text-accent hover:underline'>
          {t('stockPage')}
        </Link>
        {external.map(link => (
          <a
            key={link.kind}
            href={link.href}
            target='_blank'
            rel={TRUSTED_LINK_REL}
            className='inline-flex items-center gap-0.5 text-accent hover:underline'
          >
            {t(link.kind)}
            <ArrowUpRight aria-hidden='true' className='size-3' />
          </a>
        ))}
      </div>
      <InvestmentDisclaimer variant='short' className='border-t border-border pt-3' />
    </div>
  );
};

type CashtagLinkProps = { text: string; stock: StockSummary };

/**
 * Cashtag linki + hisse hover kartı (tasarım §4.1): şirket adı, pazar, dış kaynaklar, yatırım
 * uyarısı; fiyat yok (v1). Erişilebilir ad şirket adını içerdiği için klavye kullanıcısı kartı
 * açmadan aynı bilgiye sahip olur.
 */
export const CashtagLink = ({ text, stock }: CashtagLinkProps): ReactElement => {
  const t = useTranslations('entity');
  const finePointer = useFinePointer();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);

  return (
    <HoverCard open={open && finePointer} onOpenChange={setOpen} openDelay={400} closeDelay={200}>
      <HoverCardTrigger asChild>
        <Link
          href={stockHref(stock.ticker)}
          aria-label={t('cashtagName', { text, company: stock.companyName })}
          data-entity='cashtag'
          // E2E'nin hover'dan önce beklediği işaret: hidrasyondan önce hover olayı kaybolur.
          data-hydrated={hydrated ? 'true' : undefined}
          className={ENTITY_CLASS.cashtag}
        >
          {text}
        </Link>
      </HoverCardTrigger>
      {finePointer ? (
        <HoverCardContent className='w-80' data-testid='stock-hover-card'>
          <StockCardBody stock={stock} />
        </HoverCardContent>
      ) : null}
    </HoverCard>
  );
};
