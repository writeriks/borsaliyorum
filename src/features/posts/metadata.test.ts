import { describe, expect, it } from 'vitest';

import { toRichTextContent } from '@/components/rich-text/resolve';

import { buildPostMetadata, notFoundPostMetadata, type PostMetadataLabels } from './metadata';
import type { PostCardData } from './types';

const labels: PostMetadataLabels = {
  title: ({ name, excerpt }) => `${name}: “${excerpt}”`,
  titleNoText: ({ name }) => `Gönderen: ${name}`,
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

const PATHS = {
  canonical: '/gonderi/1',
  languages: { tr: '/gonderi/1', en: '/en/gonderi/1', 'x-default': '/gonderi/1' },
};

describe('buildPostMetadata', () => {
  it('başlık "{ad}: “alıntı”", açıklama ilk 160 karakter, OpenGraph article + kanonik yol', () => {
    const text = `${'a'.repeat(100)} ${'b'.repeat(100)}`;
    const meta = buildPostMetadata(withBody(text), PATHS, labels);
    expect(meta.title).toMatch(/^Ayşe Kaya: “a{59}…” · Borsalıyorum$/);
    expect(meta.description).toHaveLength(160);
    expect(meta.description?.endsWith('…')).toBe(true);
    expect(meta.alternates).toEqual({
      canonical: '/gonderi/1',
      languages: { tr: '/gonderi/1', en: '/en/gonderi/1', 'x-default': '/gonderi/1' },
    });
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
      withBody('$(THYAO) yükselir\n\n@(ali) ‮ters\u0007', 1),
      PATHS,
      labels
    );
    expect(meta.description).toBe('$THYAO yükselir @ali ters');
    expect(JSON.stringify(meta)).not.toMatch(/\$\(|"items"|\\n|‮|\u0007/);
  });

  it('HTML içeren metin olduğu gibi düz metin kalır (kaçış Next’in meta render’ında)', () => {
    const meta = buildPostMetadata(withBody('<script>alert(1)</script> & "tırnak"'), PATHS, labels);
    expect(meta.description).toBe('<script>alert(1)</script> & "tırnak"');
  });

  it('metinsiz gönderide "Gönderen: {ad}", açıklama yok', () => {
    const meta = buildPostMetadata(withBody('   '), PATHS, labels);
    expect(meta.title).toBe('Gönderen: Ayşe Kaya · Borsalıyorum');
    expect(meta.description).toBeUndefined();
  });
});

describe('notFoundPostMetadata', () => {
  it('404 (silinmiş, engelli, olmayan): yalnızca başlık; içerik, yazar ve OpenGraph yok', () => {
    expect(notFoundPostMetadata('Gönderi bulunamadı', 'Borsalıyorum')).toEqual({
      title: 'Gönderi bulunamadı · Borsalıyorum',
    });
  });
});
