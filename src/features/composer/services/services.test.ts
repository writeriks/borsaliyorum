import { describe, expect, it, vi } from 'vitest';

import { FIXTURE_STOCKS } from './fixtures';
import { createHttpComposerServices, ServiceResponseError } from './http';
import { rankMockTags, rankMockUsers } from './mock';

const signal = new AbortController().signal;

const fetchReturning = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

describe('createHttpComposerServices (S7/S9 sözleşmesi)', () => {
  it('hisse indeksini doğrulayıp döner', async () => {
    const fetchImpl = fetchReturning(FIXTURE_STOCKS);
    const services = createHttpComposerServices(fetchImpl);
    await expect(services.stockIndex(signal)).resolves.toEqual(FIXTURE_STOCKS);
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/autocomplete/stocks',
      expect.objectContaining({ signal, credentials: 'same-origin' })
    );
  });

  it('sorgu metni URL’de kodlanır', async () => {
    const fetchImpl = fetchReturning([]);
    await createHttpComposerServices(fetchImpl).users('ay şe&x', signal);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe('/api/autocomplete/users?q=ay+%C5%9Fe%26x');
  });

  it('kullanıcı DTO’sundaki fazladan alanlar (ör. e-posta) atılır [AC-14]', async () => {
    const fetchImpl = fetchReturning([
      { username: 'aysek', displayName: 'Ayşe', avatarUrl: null, following: true, email: 'a@b.co' },
    ]);
    const users = await createHttpComposerServices(fetchImpl).users('ay', signal);
    expect(users).toEqual([
      { username: 'aysek', displayName: 'Ayşe', avatarUrl: null, following: true },
    ]);
  });

  it('HTTP hatası ve şemaya uymayan yanıt hata fırlatır (UI hata durumuna düşer)', async () => {
    await expect(
      createHttpComposerServices(fetchReturning({}, 500)).tags('bi', signal)
    ).rejects.toBeInstanceOf(ServiceResponseError);
    await expect(
      createHttpComposerServices(fetchReturning([{ slug: 'x' }])).tags('bi', signal)
    ).rejects.toThrow();
  });

  it('javascript: avatar URL’si kabul edilmez', async () => {
    const fetchImpl = fetchReturning([
      { username: 'x_1', displayName: 'X', avatarUrl: 'javascript:alert(1)', following: false },
    ]);
    await expect(createHttpComposerServices(fetchImpl).users('x', signal)).rejects.toThrow();
  });

  it('link önizleme: ok → kart, none → null', async () => {
    const ok = fetchReturning({
      status: 'ok',
      url: 'https://kap.org.tr/x',
      host: 'kap.org.tr',
      siteName: null,
      title: 'Başlık',
      description: null,
    });
    await expect(
      createHttpComposerServices(ok).linkPreview('https://kap.org.tr/x', signal)
    ).resolves.toEqual({
      url: 'https://kap.org.tr/x',
      host: 'kap.org.tr',
      siteName: null,
      title: 'Başlık',
      description: null,
    });
    const none = fetchReturning({ status: 'none' });
    await expect(
      createHttpComposerServices(none).linkPreview('https://a.com', signal)
    ).resolves.toBeNull();
  });
});

describe('sahte sıralama (S7 kurallarının karşılığı)', () => {
  it('@ay: takip edilen önce, engelleyen hiç yok [AC-12, AC-13]', () => {
    expect(rankMockUsers('ay').map(u => u.username)).toEqual(['aysek', 'aysegul']);
    expect(rankMockUsers('eng')).toEqual([]);
    expect(rankMockUsers('').map(u => u.username)).toEqual(['aysek']);
  });

  it('#bi: kullanım sayısına göre [AC-11]', () => {
    expect(rankMockTags('bi').map(t => t.slug)).toEqual(['bist100', 'bilanco', 'bist30']);
  });
});
