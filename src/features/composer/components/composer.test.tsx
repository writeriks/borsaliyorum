import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@tests/utils/render';

import { ErrorCode, fail, ok } from '@/lib/errors';

import tr from '../../../../messages/tr.json';
import { createMockComposerServices } from '../services/mock';
import type { PostSubmitHandler } from '../types';

import { CharCounter } from './char-counter';
import { Composer, type ComposerHandle } from './composer';
import { ComposerGate } from './composer-lazy';

vi.mock('sonner', () => ({ toast: vi.fn() }));

const withQuery = (ui: ReactNode): ReactElement => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {ui}
  </QueryClientProvider>
);

const services = createMockComposerServices(0);

/** jsdom'da klavye yazımı yerine editör komutuyla içerik verilir (contenteditable sınırlı). */
const setText = async (handle: { current: ComposerHandle | null }, text: string): Promise<void> => {
  await waitFor(() => expect(handle.current).not.toBeNull());
  const box = await screen.findByRole('textbox', { name: tr.composer.label.post });
  await act(async () => {
    const editor = (
      box as HTMLElement & { editor?: { commands: { setContent: (v: string) => void } } }
    ).editor;
    editor?.commands.setContent(text);
  });
};

const renderPost = (onSubmit: PostSubmitHandler) => {
  const handle: { current: ComposerHandle | null } = { current: null };
  renderWithIntl(
    withQuery(
      <Composer
        mode='post'
        draftOwnerId={7}
        services={services}
        onSubmit={onSubmit}
        handleRef={instance => {
          handle.current = instance;
        }}
      />
    )
  );
  return handle;
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('Composer (jsdom)', () => {
  it('sponsorlu + tanınmış cashtag: Paylaş pasif, mesaj görünür, gönderim yok [LEG-07]', async () => {
    const onSubmit = vi.fn<PostSubmitHandler>(async () => ok({ id: 1 }));
    const handle = renderPost(onSubmit);
    await setText(handle, '$THYAO hedef');
    await userEvent.click(screen.getByRole('switch', { name: tr.composer.sponsored.label }));
    expect(await screen.findByText(tr.composer.sponsored.cashtagBlocked)).toBeVisible();
    const submit = screen.getByTestId('composer-submit');
    expect(submit).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('cashtag’siz sponsorlu gönderi serbest; clientRequestId ve bayraklar iletilir', async () => {
    const onSubmit = vi.fn<PostSubmitHandler>(async () => ok({ id: 9 }));
    const handle = renderPost(onSubmit);
    await setText(handle, 'Marka ile işbirliği');
    await userEvent.click(screen.getByRole('switch', { name: tr.composer.sponsored.label }));
    await userEvent.click(screen.getByTestId('composer-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      text: 'Marka ile işbirliği',
      isSponsored: true,
      sentiment: 'neutral',
      previewUrl: null,
      clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
  });

  it('hata sonrası aynı içerikle yeniden deneme aynı clientRequestId’yi taşır', async () => {
    const onSubmit = vi
      .fn<PostSubmitHandler>()
      .mockResolvedValueOnce(fail(ErrorCode.INTERNAL))
      .mockResolvedValueOnce(ok({ id: 3 }));
    const handle = renderPost(onSubmit);
    await setText(handle, 'Tekrar');
    await userEvent.click(screen.getByTestId('composer-submit'));
    const retry = await screen.findByRole('button', { name: tr.common.retry });
    await userEvent.click(retry);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1]?.[0].clientRequestId).toBe(
      onSubmit.mock.calls[0]?.[0].clientRequestId
    );
  });

  it('401 → taslak hemen kaydedilir ve giriş bağlantısı görünür [SND-06]', async () => {
    const handle = renderPost(async () => fail(ErrorCode.UNAUTHENTICATED));
    await setText(handle, 'Saklanacak');
    await userEvent.click(screen.getByTestId('composer-submit'));
    expect(await screen.findByRole('link', { name: tr.common.login })).toHaveAttribute(
      'href',
      '/giris'
    );
    expect(window.localStorage.getItem('bz:draft:7:post')).toContain('Saklanacak');
  });

  it('kayıtlı taslak açılışta geri yüklenir [DRF-02]', async () => {
    window.localStorage.setItem(
      'bz:draft:7:post',
      JSON.stringify({
        v: 1,
        savedAt: Date.now(),
        text: 'Geri gel',
        sentiment: 'neutral',
        isSponsored: false,
        previewDismissed: false,
      })
    );
    renderPost(async () => ok({ id: 1 }));
    expect(await screen.findByText(tr.composer.draft.restored)).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: tr.composer.label.post })).toHaveTextContent(
        'Geri gel'
      )
    );
  });
});

describe('CharCounter', () => {
  it('%80 altında görünmez, eşikte kalan sayıyı gösterir', () => {
    const { rerender } = renderWithIntl(<CharCounter id='c' count={799} limit={1000} />);
    expect(screen.queryByTestId('char-counter-value')).toBeNull();
    rerender(<CharCounter id='c' count={1012} limit={1000} />);
    expect(screen.getByTestId('char-counter-value')).toHaveTextContent('-12');
    expect(screen.getByTestId('char-counter')).toHaveAttribute('data-tone', 'danger');
  });
});

describe('ComposerGate (tasarım §1.9)', () => {
  it('unknown: skeleton, asla "Giriş yap" yok', () => {
    renderWithIntl(
      <ComposerGate viewer={{ status: 'unknown' }} mode='post'>
        {() => <div>composer</div>}
      </ComposerGate>
    );
    expect(screen.getByTestId('composer-skeleton')).toBeInTheDocument();
    expect(screen.queryByText(tr.common.login)).toBeNull();
  });

  it('anonymous: giriş çağrısı, composer yok', () => {
    renderWithIntl(
      <ComposerGate viewer={{ status: 'anonymous' }} mode='comment'>
        {() => <div>composer</div>}
      </ComposerGate>
    );
    expect(screen.getByText(tr.composer.anon.comment)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr.common.login })).toBeInTheDocument();
    expect(screen.queryByText('composer')).toBeNull();
  });

  it('authenticated: kullanıcı kimliğiyle composer', () => {
    renderWithIntl(
      <ComposerGate viewer={{ status: 'authenticated', userId: 5 }} mode='post'>
        {userId => <div>{`composer ${userId}`}</div>}
      </ComposerGate>
    );
    expect(screen.getByText('composer 5')).toBeInTheDocument();
  });
});
