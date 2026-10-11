import { describe, expect, it } from 'vitest';

import { toRichTextContent } from '@/components/rich-text/resolve';

import { buildPostMetadata, type PostMetadataLabels } from './metadata';
import type { PostCardData } from './types';

const labels: PostMetadataLabels = {
  title: ({ name, excerpt }) => `${name}: “${excerpt}”`,
  titleNoText: ({ name }) => `Gönderen: ${name}`,
  removed: 'Gönderi kaldırıldı',
  unavailable: 'İçerik görüntülenemiyor',
  siteName: 'Borsalıyorum',
};

const withBody = (content: string, contentFormat = 2): PostCardData => ({
  id: 1,
  author: { username: 'aysek', displayName: 'Ayşe Kaya', avatarUrl: null },
  createdAt: '2026-10-10T11:32:00.000Z',
  body: toRichTextContent({ content, contentFormat, entities: null }),
  stocks: {},
  sentiment: 'neutral',
  isSponsored: false,
  mediaUrl: null,
  linkPreview: { status: 'none' },
  counts: { likes: 0, comments: 0, reposts: 0 },
});

describe('buildPostMetadata', () => {
  it('başlık "{ad}: “alıntı”", açıklama ilk 160 karakter, OpenGraph article + kanonik yol', () => {
    const text = `${'a'.repeat(100)} ${'b'.repeat(100)}`;
    const meta = buildPostMetadata({ status: 'ok', post: withBody(text) }, '/gonderi/1', labels);
    expect(meta.title).toMatch(/^Ayşe Kaya: “a{59}…” · Borsalıyorum$/);
    expect(meta.description).toHaveLength(160);
    expect(meta.description?.endsWith('…')).toBe(true);
    expect(meta.alternates?.canonical).toBe('/gonderi/1');
    expect(meta.openGraph).toMatchObject({
      type: 'article',
      url: '/gonderi/1',
      siteName: 'Borsalıyorum',
      description: meta.description,
    });
    expect(meta.robots).toBeUndefined();
  });

  it('eski markup ve entity JSON’u sızmaz; satır sonları ve kontrol/bidi karakterleri temizlenir', () => {
    const meta = buildPostMetadata(
      { status: 'ok', post: withBody('$(THYAO) yükselir\n\n@(ali) ‮ters\u0007', 1) },
      '/gonderi/1',
      labels
    );
    expect(meta.description).toBe('$THYAO yükselir @ali ters');
    expect(JSON.stringify(meta)).not.toMatch(/\$\(|"items"|\\n|‮|\u0007/);
  });

  it('HTML içeren metin olduğu gibi düz metin kalır (kaçış Next’in meta render’ında)', () => {
    const meta = buildPostMetadata(
      { status: 'ok', post: withBody('<script>alert(1)</script> & "tırnak"') },
      '/gonderi/1',
      labels
    );
    expect(meta.description).toBe('<script>alert(1)</script> & "tırnak"');
  });

  it('metinsiz gönderide "Gönderen: {ad}", açıklama yok', () => {
    const meta = buildPostMetadata({ status: 'ok', post: withBody('   ') }, '/gonderi/1', labels);
    expect(meta.title).toBe('Gönderen: Ayşe Kaya · Borsalıyorum');
    expect(meta.description).toBeUndefined();
  });

  it('kaldırılmış ve görüntülenemeyen gönderi: noindex, içerik ve yazar yok', () => {
    for (const detail of [
      { status: 'removed', byModeration: true } as const,
      { status: 'unavailable' } as const,
    ]) {
      const meta = buildPostMetadata(detail, '/gonderi/1', labels);
      expect(meta.robots).toEqual({ index: false, follow: false });
      expect(meta.openGraph).toBeUndefined();
      expect(meta.description).toBeUndefined();
    }
    expect(buildPostMetadata({ status: 'unavailable' }, '/gonderi/1', labels).title).toBe(
      'İçerik görüntülenemiyor · Borsalıyorum'
    );
  });
});
