import { z } from 'zod';

import { ENTITY_SCHEMA_VERSION, fromLegacyMarkup, type ParsedEntity } from '@/lib/entities';
import { logger } from '@/lib/logger';

import type { RichTextEntity } from './types';

/** Mention çözümü için güncel kullanıcı (DTO; e-posta/uid yok). Silinmiş/askıdaki kullanıcı listede olmaz. */
export type MentionUser = { userId: number; username: string; displayName: string };

export type RichTextContent = { text: string; entities: RichTextEntity[] };

export type RichTextSource = {
  content: string;
  /** 1 = eski react-mentions markup'ı (`$(THYAO)`), 2 = düz metin + `entities` (ADR-0002). */
  contentFormat: number;
  /** `Post.entities` jsonb'si olduğu gibi; şekli burada doğrulanır. */
  entities: unknown;
};

export type ResolveOptions = {
  /** Sayfadaki gönderilerde anılan, sayfa başına tek sorguyla çekilmiş kullanıcılar. */
  users?: readonly MentionUser[];
  /** Eski veride e-posta id'li mention (`@(ali@x.com)`) için güncel ad; bkz. `fromLegacyMarkup`. */
  resolveLegacyMention?: (id: string) => string | null;
};

const offset = z.number().int().nonnegative();
const storedItemSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cashtag'), start: offset, end: offset, ticker: z.string() }),
  z.object({ type: z.literal('hashtag'), start: offset, end: offset, slug: z.string() }),
  z.object({
    type: z.literal('mention'),
    start: offset,
    end: offset,
    username: z.string(),
    userId: z.number().int().positive(),
  }),
  z.object({ type: z.literal('url'), start: offset, end: offset, href: z.string() }),
]);
const storedSchema = z.object({ v: z.literal(ENTITY_SCHEMA_VERSION), items: z.array(z.unknown()) });

type StoredItem = z.infer<typeof storedItemSchema>;

const log = logger.child({ module: 'rich-text' });

const toRenderEntity = (
  item: StoredItem,
  text: string,
  usersById: ReadonlyMap<number, MentionUser>
): RichTextEntity | null => {
  if (item.type !== 'mention') return item;
  const user = usersById.get(item.userId);
  // Silinmiş/askıdaki kullanıcı → düz metin (tasarım [ENT-R07]).
  if (user === undefined) return null;
  // Yazılan ad metinle uyuşmuyorsa kayıt bozuktur; başka bir kişiye link verilmez.
  if (text.slice(item.start + 1, item.end).toLowerCase() !== item.username.toLowerCase()) {
    return null;
  }
  return {
    type: 'mention',
    start: item.start,
    end: item.end,
    username: user.username,
    displayName: user.displayName,
  };
};

const fromStored = (
  text: string,
  raw: unknown,
  usersById: ReadonlyMap<number, MentionUser>
): RichTextEntity[] => {
  if (raw === null || raw === undefined) return [];
  const parsed = storedSchema.safeParse(raw);
  if (!parsed.success) {
    log.warn('entities jsonb şekli geçersiz; gönderi düz metin render ediliyor');
    return [];
  }
  let invalid = 0;
  const result: RichTextEntity[] = [];
  for (const candidate of parsed.data.items) {
    const item = storedItemSchema.safeParse(candidate);
    if (!item.success) {
      invalid += 1;
      continue;
    }
    const entity = toRenderEntity(item.data, text, usersById);
    if (entity !== null) result.push(entity);
  }
  if (invalid > 0) log.warn('geçersiz entity atlandı', { invalid });
  return result;
};

const fromLegacy = (
  legacy: string,
  usersByName: ReadonlyMap<string, MentionUser>,
  resolveLegacyMention: ResolveOptions['resolveLegacyMention']
): RichTextContent => {
  const { text, entities } = fromLegacyMarkup(
    legacy,
    resolveLegacyMention ? { resolveMention: resolveLegacyMention } : {}
  );
  const result = entities.flatMap((entity: ParsedEntity): RichTextEntity[] => {
    switch (entity.type) {
      case 'mention': {
        // Eski mention kullanıcı adıyla saklanır; kullanıcı yoksa ya da ad değiştiyse düz metin.
        const user = usersByName.get(entity.username);
        if (user === undefined) return [];
        return [{ ...entity, username: user.username, displayName: user.displayName }];
      }
      case 'hashtag':
        return [{ type: 'hashtag', start: entity.start, end: entity.end, slug: entity.slug }];
      default:
        return [entity];
    }
  });
  return { text, entities: result };
};

/**
 * Gönderi/yorum satırını `RichText` girdisine çevirir. Saklanan entity'lere güvenilmez: jsonb
 * Zod ile doğrulanır, geçersiz öğe atlanır; offset/href kontrolleri ayrıca `buildSegments`'te.
 * Hiçbir girdide throw etmez.
 */
export const toRichTextContent = (
  source: RichTextSource,
  options: ResolveOptions = {}
): RichTextContent => {
  const users = options.users ?? [];
  if (source.contentFormat === 1) {
    const byName = new Map(users.map(user => [user.username.toLowerCase(), user]));
    return fromLegacy(source.content, byName, options.resolveLegacyMention);
  }
  const byId = new Map(users.map(user => [user.userId, user]));
  return { text: source.content, entities: fromStored(source.content, source.entities, byId) };
};
