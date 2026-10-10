import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import en from '../../../../messages/en.json';
import tr from '../../../../messages/tr.json';

import { LandingIntro } from './landing-intro';

describe('LandingIntro', () => {
  it.each([
    ['tr', tr],
    ['en', en],
  ] as const)('%s metinlerini başlık ve açıklama olarak gösterir', (locale, messages) => {
    render(
      <NextIntlClientProvider locale={locale} messages={messages}>
        <LandingIntro />
      </NextIntlClientProvider>
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(messages.home.title);
    expect(screen.getByText(messages.home.lead)).toBeInTheDocument();
  });
});
