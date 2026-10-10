'use client';

import { useFormatter, useNow } from 'next-intl';
import { type ReactElement, useSyncExternalStore } from 'react';

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

const TICK_MS = 60_000;

// Tüm kartların paylaştığı dakika saati: akışta kart başına ayrı interval açılmaz.
let clock = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

const tick = (): void => {
  clock = Date.now();
  for (const listener of listeners) listener();
};

const subscribeClock = (listener: () => void): (() => void) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    // İlk abone saati hemen tazeler: React abonelikten sonra snapshot'ı yeniden okur, değiştiyse
    // yeniden render eder. Önbellekten gelen HTML'deki eski "2 dk. önce" 60 sn ekranda kalmaz.
    clock = Date.now();
    timer = setInterval(tick, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    clearInterval(timer);
    timer = undefined;
    // Abone yokken saat ilerlemez; sonraki ilk okuma bayat değer döndürmesin.
    clock = 0;
  };
};

const readClock = (): number => {
  if (clock === 0) clock = Date.now();
  return clock;
};

/**
 * Canlı "şimdi". Hidrasyonda sağlayıcının `now`'ı kullanılır (sunucu HTML'iyle aynı metin, uyumsuzluk
 * yok); mount'ta hemen gerçek saate geçer, sonra dakikada bir güncellenir.
 */
const useLiveNow = (): Date => {
  const serverNow = useNow().getTime();
  const now = useSyncExternalStore(subscribeClock, readClock, () => serverNow);
  return new Date(now);
};

/**
 * Göreli zaman ("3 dk. önce"); tooltip'te tam tarih ("10 Eki 2026 14:32"), saat dilimi
 * Europe/Istanbul (i18n/request.ts ve sağlayıcıda tanımlı).
 */
export const RelativeTime = ({ dateTime, href, id, now }: RelativeTimeProps): ReactElement => {
  const format = useFormatter();
  const liveNow = useLiveNow();
  const date = new Date(dateTime);
  const reference = now === undefined ? liveNow : new Date(now);
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
