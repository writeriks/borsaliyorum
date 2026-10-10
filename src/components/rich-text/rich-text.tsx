import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement, ReactNode } from 'react';

import { Link } from '@/i18n/navigation';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

import { CashtagLink } from './cashtag-link';
import { tagHref, UGC_LINK_REL, userHref } from './entity-routes';
import { ENTITY_CLASS } from './entity-styles';
import { buildSegments, type Segment } from './segments';
import type { RichTextEntity, StockLookup } from './types';

const log = logger.child({ module: 'rich-text' });

type RichTextProps = {
  /** Düz metin (contentFormat 2) ya da eski markup'tan dönüştürülmüş metin. */
  text: string;
  entities: readonly RichTextEntity[];
  /** Cashtag'lerin şirket adı (erişilebilir ad + hover kartı). Olmayan hisse düz metin kalır. */
  stocks?: StockLookup;
  id?: string;
  className?: string;
};

const SegmentNode = ({ segment }: { segment: Segment }): ReactNode => {
  const t = useTranslations('entity');
  switch (segment.kind) {
    case 'text':
      return segment.text;
    case 'cashtag':
      return <CashtagLink text={segment.text} stock={segment.stock} />;
    case 'hashtag':
      return (
        <Link href={tagHref(segment.slug)} data-entity='hashtag' className={ENTITY_CLASS.hashtag}>
          {segment.text}
        </Link>
      );
    case 'mention':
      return (
        <Link
          href={userHref(segment.username)}
          aria-label={t('mentionName', { text: segment.text, name: segment.displayName })}
          data-entity='mention'
          className={ENTITY_CLASS.mention}
        >
          {segment.text}
        </Link>
      );
    case 'url':
      return (
        <a
          href={segment.href}
          target='_blank'
          rel={UGC_LINK_REL}
          title={segment.href}
          data-entity='url'
          className={ENTITY_CLASS.url}
        >
          {segment.display}
          <ArrowUpRight aria-hidden='true' className='ml-0.5 inline size-3 align-baseline' />
          <span className='sr-only'>{` ${t('newTab')}`}</span>
        </a>
      );
  }
};

/**
 * Gönderi/yorum metnini entity'lerle render eder (ADR-0002 Karar 5). HTML üretmez: düz parçalar
 * React tarafından escape edilen string'lerdir, satır sonları `pre-wrap` ile korunur. Bozuk
 * entity atlanır, loglanır ve o bölüm düz metin kalır; bileşen asla throw etmez.
 */
export const RichText = ({
  text,
  entities,
  stocks,
  id,
  className,
}: RichTextProps): ReactElement => {
  const { segments, skipped } = buildSegments(text, entities, stocks);
  if (skipped.length > 0) log.warn('entity atlandı; düz metin render ediliyor', { skipped });

  return (
    <p
      id={id}
      data-slot='rich-text'
      className={cn('text-post break-words whitespace-pre-wrap text-fg', className)}
    >
      {segments.map((segment, index) => (
        // Parçalar metin sırasıdır ve render sırasında değişmez; index anahtarı kararlı.
        <SegmentNode key={index} segment={segment} />
      ))}
    </p>
  );
};
