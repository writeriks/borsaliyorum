import { act, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MESSAGES } from '../../../../tests/utils/render';

import { CHARS_PER_LINE, estimateLines, readMoreReserveFor } from './clamp-estimate';
import { ClampedBody } from './clamped-body';

const SHORT = 'Kısa gövde.';
const LONG = Array.from({ length: 10 }, () => 'Uzun bir analiz satırı.').join('\n');
// Dar ekranda 6 satırı aşar, genişte aşmaz: 3 satır × 100 karakter
const MEDIUM = Array.from({ length: 3 }, () => 'a'.repeat(100)).join('\n');

const Tree = ({ text }: { text: string }): ReactElement => (
  <NextIntlClientProvider locale='tr' messages={MESSAGES.tr}>
    <ClampedBody id='govde' text={text}>
      <p>{text}</p>
    </ClampedBody>
  </NextIntlClientProvider>
);

const ssrButton = (text: string): HTMLButtonElement | null =>
  new DOMParser()
    .parseFromString(renderToString(<Tree text={text} />), 'text/html')
    .querySelector('button');

/** Tarayıcı gibi gözleme başlar başlamaz geri çağıran ResizeObserver + sabit ölçüler. */
const stubMeasurement = (overflowing: boolean): void => {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(overflowing ? 300 : 100);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      private readonly callback: ResizeObserverCallback;
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }
      observe(): void {
        this.callback([], this as unknown as ResizeObserver);
      }
      unobserve(): void {}
      disconnect(): void {}
    }
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('readMoreReserveFor', () => {
  it('satır sonları ve sarma ile satır tahmini (emoji tek karakter)', () => {
    expect(estimateLines('a\nb', CHARS_PER_LINE.wide)).toBe(2);
    expect(estimateLines('a'.repeat(CHARS_PER_LINE.wide + 1), CHARS_PER_LINE.wide)).toBe(2);
    expect(estimateLines('📈'.repeat(CHARS_PER_LINE.wide), CHARS_PER_LINE.wide)).toBe(1);
  });

  it.each([
    [SHORT, 'none'],
    [MEDIUM, 'narrow'],
    [LONG, 'always'],
  ] as const)('%#: %s', (text, expected) => {
    expect(readMoreReserveFor(text)).toBe(expected);
  });
});

describe('ClampedBody: "Devamını gör" yeri sunucuda ayrılır (CLS yok)', () => {
  it('uzun gövde: SSR HTML’inde buton satırı var ama görünmez (JS’siz çalışmaz)', () => {
    const button = ssrButton(LONG);
    expect(button?.textContent).toBe(MESSAGES.tr.post.readMore);
    expect(button?.className).toContain('min-h-hit');
    expect(button?.className).toContain('invisible');
    expect(button?.className).not.toContain('sm:hidden');
  });

  it('orta gövde: yer yalnızca dar ekranda ayrılır', () => {
    expect(ssrButton(MEDIUM)?.className).toContain('sm:hidden');
  });

  it('kısa gövde: SSR’da buton satırı yok', () => {
    expect(ssrButton(SHORT)).toBeNull();
  });

  it('istemci taşma ölçerse ayrılmış satırdaki butonu görünür yapar', () => {
    stubMeasurement(true);
    render(<Tree text={LONG} />);
    const button = screen.getByRole('button', { name: MESSAGES.tr.post.readMore });
    expect(button).not.toHaveClass('invisible');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    act(() => button.click());
    expect(screen.getByRole('button', { name: MESSAGES.tr.post.readLess })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('taşma yoksa ayrılmış satır yerinde kalır, yalnızca gizlenir', () => {
    stubMeasurement(false);
    const { container } = render(<Tree text={LONG} />);
    const button = container.querySelector('button');
    expect(button).toHaveClass('invisible', 'min-h-hit');
    expect(button).toHaveAttribute('aria-hidden', 'true');
    expect(button).toHaveAttribute('tabindex', '-1');
  });

  it('tahmin taşmayı kaçırırsa buton yine de eklenir (metin okunamaz kalmasın)', () => {
    stubMeasurement(true);
    render(<Tree text={SHORT} />);
    expect(screen.getByRole('button', { name: MESSAGES.tr.post.readMore })).not.toHaveClass(
      'invisible'
    );
  });
});
