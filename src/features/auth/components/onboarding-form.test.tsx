import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SUPPORT_EMAIL } from '@/lib/support';

import { MESSAGES, renderWithIntl } from '../../../../tests/utils/render';

import { OnboardingForm } from './onboarding-form';

const completeOnboarding = vi.fn();
const checkUsernameAvailability = vi.fn();
vi.mock('../server/actions', () => ({
  completeOnboarding: (...args: unknown[]) => completeOnboarding(...args),
  checkUsernameAvailability: (...args: unknown[]) => checkUsernameAvailability(...args),
}));

const tr = MESSAGES.tr.auth.onboarding;

const fillValid = async (): Promise<void> => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(tr.username.label), 'ayse_k');
  await user.clear(screen.getByLabelText(tr.displayName.label));
  await user.type(screen.getByLabelText(tr.displayName.label), 'Ayşe');
  await user.click(screen.getByLabelText(tr.age.label));
  await user.click(screen.getByLabelText(/Aydınlatma Metni/));
};

beforeEach(() => {
  completeOnboarding.mockReset();
  checkUsernameAvailability.mockReset();
  checkUsernameAvailability.mockResolvedValue({ ok: true, data: { availability: 'available' } });
});

const renderForm = (): void => {
  renderWithIntl(
    <OnboardingForm email='ayse@example.test' suggestedDisplayName={null} next={null} />
  );
};

describe('OnboardingForm', () => {
  it('gönderim sürerken onay kutuları kilitli (gönderilen değer değiştirilemez)', async () => {
    completeOnboarding.mockReturnValue(new Promise(() => undefined));
    renderForm();
    await fillValid();
    await userEvent.click(screen.getByTestId('onboarding-submit'));

    await waitFor(() => expect(screen.getByTestId('onboarding-submit')).toBeDisabled());
    expect(screen.getByLabelText(tr.age.label)).toBeDisabled();
    expect(screen.getByLabelText(/Aydınlatma Metni/)).toBeDisabled();
    expect(screen.getByLabelText(tr.marketing.label)).toBeDisabled();
    expect(completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        ageConfirmed: true,
        noticeAcknowledged: true,
        marketingOptIn: false,
      })
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
