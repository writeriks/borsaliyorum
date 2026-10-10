import { act, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipProvider } from '@/components/ui/tooltip';

import { MESSAGES } from '../../../../tests/utils/render';

import { RelativeTime } from './relative-time';

// Önbellekli HTML senaryosu: sayfa 11:30'da üretildi, kullanıcı 11:35'te açtı.
const RENDERED_AT = new Date('2026-10-10T11:30:00.000Z');
const OPENED_AT = new Date('2026-10-10T11:35:00.000Z');
const CREATED_AT = '2026-10-10T11:28:00.000Z';

const Tree = ({ fixedNow }: { fixedNow?: string }): ReactElement => (
  <NextIntlClientProvider
    locale='tr'
    messages={MESSAGES.tr}
    timeZone='Europe/Istanbul'
    now={RENDERED_AT}
  >
    <TooltipProvider>
      <RelativeTime dateTime={CREATED_AT} href='/gonderi/1' now={fixedNow} />
    </TooltipProvider>
  </NextIntlClientProvider>
);

const timeText = (): string | null => screen.getByRole('link').textContent;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(OPENED_AT);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('RelativeTime', () => {
  it('sunucu HTML’i sağlayıcının "şimdi"siyle üretilir (hidrasyon uyumlu)', () => {
    expect(renderToString(<Tree />)).toContain('2 dk. önce');
  });

  it('mount’ta beklemeden tazelenir: önbellekli "2 dk. önce" 60 sn kalmaz', () => {
    render(<Tree />);
    expect(timeText()).toBe('7 dk. önce');
  });

  it('dakika eşiği: 59. saniyede aynı, 60. saniyede bir dakika ilerler', () => {
    render(<Tree />);
    act(() => {
      vi.advanceTimersByTime(59_000);
    });
    expect(timeText()).toBe('7 dk. önce');
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(timeText()).toBe('8 dk. önce');
  });

  it('kartlar tek saati paylaşır; son kart kalkınca saat durur', () => {
    const first = render(<Tree />);
    const second = render(<Tree />);
    expect(vi.getTimerCount()).toBe(1);
    first.unmount();
    second.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sabit `now` verilirse canlı saat kullanılmaz', () => {
    render(<Tree fixedNow='2026-10-10T11:31:00.000Z' />);
    expect(timeText()).toBe('3 dk. önce');
  });
});
