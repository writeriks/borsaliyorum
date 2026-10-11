import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SUPPORT_EMAIL } from '@/lib/support';

import { MESSAGES, renderWithIntl, type TestLocale } from '../../../../tests/utils/render';

import { OnboardingForm } from './onboarding-form';

const completeOnboarding = vi.fn();
const checkUsernameAvailability = vi.fn();
vi.mock('../server/actions', () => ({
  completeOnboarding: (...args: unknown[]) => completeOnboarding(...args),
  checkUsernameAvailability: (...args: unknown[]) => checkUsernameAvailability(...args),
}));

const tr = MESSAGES.tr.auth.onboarding;

const fillValid = async ({ terms = true }: { terms?: boolean } = {}): Promise<void> => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(tr.username.label), 'ayse_k');
  await user.clear(screen.getByLabelText(tr.displayName.label));
  await user.type(screen.getByLabelText(tr.displayName.label), 'Ayşe');
  await user.click(screen.getByLabelText(tr.age.label));
  if (terms) await user.click(screen.getByLabelText(/Kullanım Koşulları/));
  await user.click(screen.getByLabelText(/Aydınlatma Metni/));
};

beforeEach(() => {
  completeOnboarding.mockReset();
  checkUsernameAvailability.mockReset();
  checkUsernameAvailability.mockResolvedValue({ ok: true, data: { availability: 'available' } });
});

const renderForm = (marketingEnabled = false): void => {
  renderWithIntl(
    <OnboardingForm
      email='ayse@example.test'
      suggestedDisplayName={null}
      next={null}
      marketingEnabled={marketingEnabled}
    />
  );
};

describe('OnboardingForm', () => {
  it('gönderim sürerken onay kutuları kilitli (gönderilen değer değiştirilemez)', async () => {
    completeOnboarding.mockReturnValue(new Promise(() => undefined));
    renderForm(true);
    await fillValid();
    await userEvent.click(screen.getByTestId('onboarding-submit'));

    await waitFor(() => expect(screen.getByTestId('onboarding-submit')).toBeDisabled());
    expect(screen.getByLabelText(tr.age.label)).toBeDisabled();
    expect(screen.getByLabelText(/Kullanım Koşulları/)).toBeDisabled();
    expect(screen.getByLabelText(/Aydınlatma Metni/)).toBeDisabled();
    expect(screen.getByLabelText(tr.marketing.label)).toBeDisabled();
    expect(completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        ageConfirmed: true,
        termsAccepted: true,
        noticeAcknowledged: true,
        marketingOptIn: false,
      })
    );
  });

  it('Kullanım Koşulları kutusu ayrı, işaretsiz ve zorunlu: işaretlenmeden gönderilemez', async () => {
    renderForm();
    const terms = screen.getByLabelText(/Kullanım Koşulları/);
    expect(terms).not.toBeChecked();
    // Aydınlatma kutusuyla birleştirilmemiş
    expect(terms).not.toBe(screen.getByLabelText(/Aydınlatma Metni/));
    expect(screen.getByRole('link', { name: 'Kullanım Koşulları' })).toHaveAttribute(
      'href',
      '/yasal/kullanim-kosullari'
    );

    await fillValid({ terms: false });
    await userEvent.click(screen.getByTestId('onboarding-submit'));

    expect(await screen.findByText(tr.terms.required)).toBeInTheDocument();
    expect(terms).toHaveAttribute('aria-invalid', 'true');
    expect(completeOnboarding).not.toHaveBeenCalled();
  });

  it('sıra: 18+ → Kullanım Koşulları → Aydınlatma → pazarlama (flag açıkken)', () => {
    renderForm(true);
    const ids = screen.getAllByRole('checkbox').map(box => box.id);
    expect(ids).toEqual([
      'onboarding-age',
      'onboarding-terms',
      'onboarding-notice',
      'onboarding-marketing',
    ]);
    expect(screen.getByLabelText(tr.marketing.label)).not.toBeChecked();
  });

  it('pazarlama kutusu flag kapalıyken hiç render edilmez', async () => {
    completeOnboarding.mockReturnValue(new Promise(() => undefined));
    renderForm(false);
    expect(screen.queryByLabelText(tr.marketing.label)).not.toBeInTheDocument();
    expect(screen.queryByText(tr.marketing.hint)).not.toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);

    await fillValid();
    await userEvent.click(screen.getByTestId('onboarding-submit'));
    await waitFor(() =>
      expect(completeOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({ marketingOptIn: false })
      )
    );
  });

  it('ACCOUNT_EMAIL_CONFLICT → takılı form yerine açık mesaj + destek iletişimi', async () => {
    completeOnboarding.mockResolvedValue({ ok: false, error: 'ACCOUNT_EMAIL_CONFLICT' });
    renderForm();
    await fillValid();
    await userEvent.click(screen.getByTestId('onboarding-submit'));

    const notice = await screen.findByTestId('email-conflict-notice');
    expect(notice).toHaveTextContent(tr.emailConflict.title);
    expect(notice).toHaveTextContent('ayse@example.test');
    expect(screen.getByRole('link', { name: SUPPORT_EMAIL })).toHaveAttribute(
      'href',
      `mailto:${SUPPORT_EMAIL}`
    );
    expect(screen.queryByTestId('onboarding-submit')).not.toBeInTheDocument();
  });
});

describe('onboarding yasal metinleri (docs/legal/auth-metinleri.md)', () => {
  const locales: TestLocale[] = ['tr', 'en'];

  it.each(locales)(
    '%s: aydınlatma kutusu "okudum ve anladım"; kabul/onay/rıza kelimesi yok',
    locale => {
      const notice = MESSAGES[locale].auth.onboarding.notice;
      const text = `${notice.label} ${notice.required}`.toLocaleLowerCase(locale);
      expect(text).toContain(locale === 'tr' ? 'okudum ve anladım' : 'read and understood');
      for (const word of ['kabul', 'onay', 'rıza', 'accept', 'agree', 'consent']) {
        expect(text, word).not.toContain(word);
      }
    }
  );

  it('18+ metni tam 18 yaşındakini de kapsar', () => {
    expect(MESSAGES.tr.auth.onboarding.age.label).toBe('18 yaşında ya da daha büyüğüm.');
    expect(MESSAGES.en.auth.onboarding.age.label).toBe('I am 18 or older.');
  });

  it.each(locales)('%s: İngilizce/Türkçe arayüzde aynı kutular render edilir', locale => {
    renderWithIntl(
      <OnboardingForm
        email='a@example.test'
        suggestedDisplayName={null}
        next={null}
        marketingEnabled={false}
      />,
      locale
    );
    expect(screen.getByLabelText(MESSAGES[locale].auth.onboarding.age.label)).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });
});
