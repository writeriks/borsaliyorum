import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactElement, type ReactNode, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@tests/utils/render';

import { SIGNED_OUT_EVENT } from '@/lib/auth-events';
import { ErrorCode, fail, ok } from '@/lib/errors';

import tr from '../../../../messages/tr.json';
import { createMockComposerServices } from '../services/mock';
import type { PostSubmitHandler } from '../types';

import { CharCounter } from './char-counter';
import { Composer, type ComposerHandle } from './composer';
import { ComposerGate, ComposerSkeleton } from './composer-lazy';

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

const renderPost = (onSubmit: PostSubmitHandler, composerServices = services) => {
  const handle: { current: ComposerHandle | null } = { current: null };
  renderWithIntl(
    withQuery(
      <Composer
        mode='post'
        draftOwnerId={7}
        services={composerServices}
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
  it('editör DOM’a takıldığı anda erişilebilir adı ve açıklaması zaten var (axe yarışı)', async () => {
    // Takma (layout) ile nitelik ataması arasında boşluk kalırsa, o arada çalışan axe veya
    // ekran okuyucu etiketsiz bir contenteditable görür. Kayıtlar mutasyon sırasını korur:
    // takıldıktan sonra `oldValue === null` olan bir nitelik kaydı, takma anında yok demektir.
    const records: MutationRecord[] = [];
    const observer = new MutationObserver(batch => records.push(...batch));
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['aria-label', 'aria-describedby'],
    });
    renderPost(vi.fn<PostSubmitHandler>(async () => ok({ id: 1 })));
    await screen.findByRole('textbox', { name: tr.composer.label.post });
    records.push(...observer.takeRecords());
    observer.disconnect();

    const attachIndex = records.findIndex(
      record =>
        record.type === 'childList' &&
        [...record.addedNodes].some(
          node => node instanceof HTMLElement && node.classList.contains('tiptap')
        )
    );
    expect(attachIndex).toBeGreaterThanOrEqual(0);
    const missingAtAttach = records
      .slice(attachIndex + 1)
      .filter(
        record =>
          record.type === 'attributes' &&
          record.target instanceof HTMLElement &&
          record.target.classList.contains('tiptap') &&
          record.oldValue === null
      )
      .map(record => record.attributeName);
    expect(missingAtAttach).toEqual([]);
  });

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

  it('hata sonrası sponsorluk açılıp yeniden denenirse yeni clientRequestId gider', async () => {
    // Anahtar yalnızca metne bağlıysa sunucu ilk (sponsorsuz) isteğin kaydını döndürür ve
    // "Reklam / İşbirliği" etiketi sessizce düşer.
    const onSubmit = vi
      .fn<PostSubmitHandler>()
      .mockResolvedValueOnce(fail(ErrorCode.INTERNAL))
      .mockResolvedValueOnce(ok({ id: 4 }));
    const handle = renderPost(onSubmit);
    await setText(handle, 'Marka ile işbirliği');
    await userEvent.click(screen.getByTestId('composer-submit'));
    const retry = await screen.findByRole('button', { name: tr.common.retry });
    await userEvent.click(screen.getByRole('switch', { name: tr.composer.sponsored.label }));
    await userEvent.click(retry);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    const [first, second] = onSubmit.mock.calls.map(call => call[0]);
    expect(first?.isSponsored).toBe(false);
    expect(second?.isSponsored).toBe(true);
    expect(second?.clientRequestId).not.toBe(first?.clientRequestId);
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

  it('geri yüklenen taslağın görüşü hisse indeksi yüklenene kadar korunur', async () => {
    window.localStorage.setItem(
      'bz:draft:7:post',
      JSON.stringify({
        v: 1,
        savedAt: Date.now(),
        text: '$THYAO yükselir',
        sentiment: 'bullish',
        isSponsored: false,
        previewDismissed: false,
      })
    );
    // İndeks gecikmeli: ilk render'larda tanınmış cashtag yok gibi görünür
    renderPost(async () => ok({ id: 1 }), createMockComposerServices(200));
    const bullish = await screen.findByRole('radio', { name: tr.composer.sentiment.bullish });
    expect(bullish).toBeChecked();
  });

  it('çıkış olayından sonra taslak yeniden yazılmaz (gecikmeli kayıt, sekme gizlenmesi)', async () => {
    const handle = renderPost(async () => ok({ id: 1 }));
    await setText(handle, 'Çıkıştan önce');
    act(() => {
      window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
    });
    window.localStorage.removeItem('bz:draft:7:post');
    act(() => {
      handle.current?.saveDraft();
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await new Promise(resolve => setTimeout(resolve, 600));
    expect(window.localStorage.getItem('bz:draft:7:post')).toBeNull();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
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
    // Auth iskeleti chunk iskeleti olarak işaretlenmez (auth flash testi bunu yakalamalı)
    expect(screen.getByTestId('composer-skeleton')).not.toHaveAttribute('data-skeleton');
    expect(screen.queryByText(tr.common.login)).toBeNull();
  });

  it('chunk iskeleti data-skeleton="chunk" taşır', () => {
    renderWithIntl(<ComposerSkeleton reason='chunk' />);
    expect(screen.getByTestId('composer-skeleton')).toHaveAttribute('data-skeleton', 'chunk');
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

  it('çıkış olayında bu cihazdaki tüm taslaklar silinir [DRF-04]', () => {
    window.localStorage.setItem('bz:draft:5:post', '{}');
    window.localStorage.setItem('bz:draft:5:comment:9', '{}');
    window.localStorage.setItem('baska-anahtar', 'kalsin');
    renderWithIntl(
      <ComposerGate viewer={{ status: 'authenticated', userId: 5 }} mode='post'>
        {() => <div>composer</div>}
      </ComposerGate>
    );
    act(() => {
      window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
    });
    expect(window.localStorage.getItem('bz:draft:5:post')).toBeNull();
    expect(window.localStorage.getItem('bz:draft:5:comment:9')).toBeNull();
    expect(window.localStorage.getItem('baska-anahtar')).toBe('kalsin');
  });

  it('kullanıcı değişince composer yeniden kurulur (önceki kullanıcının durumu taşınmaz)', async () => {
    const Child = (): ReactElement => {
      const [value] = useState(() => Math.random());
      return <div data-testid='child'>{value}</div>;
    };
    const { rerender } = renderWithIntl(
      <ComposerGate viewer={{ status: 'authenticated', userId: 5 }} mode='post'>
        {() => <Child />}
      </ComposerGate>
    );
    const before = screen.getByTestId('child').textContent;
    rerender(
      <ComposerGate viewer={{ status: 'authenticated', userId: 6 }} mode='post'>
        {() => <Child />}
      </ComposerGate>
    );
    expect(screen.getByTestId('child').textContent).not.toBe(before);
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
