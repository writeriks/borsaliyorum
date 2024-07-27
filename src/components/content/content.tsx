import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { TagsEnum } from '@/services/firebase-service/types/db-types/tag';
import { useRouter } from 'next/navigation';
import useOverflowDetection from '@/hooks/useOverflowDetection';
import ContentTagWithTooltip from '@/components/content/content-tag/content-tag-with-tooltip';
import ContentTag from '@/components/content/content-tag/content-tag';

interface ContentProps {
  content: string;
}

const Content: React.FC<ContentProps> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isOverflowing, contentRef } = useOverflowDetection(content);
  const router = useRouter();

  const toggleReadMore = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const onTagClick = (e: React.MouseEvent<HTMLDivElement>, tag: string): void => {
    e.stopPropagation();
    const tagType = tag[0];
    switch (tagType) {
      case TagsEnum.CASHTAG:
        router.replace(`stocks/${tag}`);
        break;
      case TagsEnum.MENTION:
        router.replace(`users/${tag}`);
        break;
      case TagsEnum.HASHTAG:
      default:
        router.replace(`tags/${tag.replace(TagsEnum.HASHTAG, '')}`);
        break;
    }
  };

  const renderContent = (text: string): React.ReactNode => {
    const regex = /(\$\((.*?)\)|#\((.*?)\)|@\((.*?)\))/g;
    const parts: React.ReactNode[] = [];

    text.split('\n').forEach((line, lineIndex) => {
      const matches = [...line.matchAll(regex)];
      let lastLineIndex = 0;

      matches.forEach((match, matchIndex) => {
        const [fullMatch, p1, p2, p3, p4] = match;
        const offset = match.index ?? 0;

        if (lastLineIndex < offset) {
          parts.push(line.substring(lastLineIndex, offset));
        }

        const symbol = fullMatch[0];
        const tag = symbol + (p2 || p3 || p4);

        parts.push(
          <div key={`${lineIndex}-${matchIndex}`} onClick={e => onTagClick(e, tag)}>
            {tag.startsWith('$') ? (
              <ContentTagWithTooltip tag={tag} lineIndex={lineIndex} offset={offset} />
            ) : (
              <ContentTag tag={tag} lineIndex={lineIndex} offset={offset} />
            )}
          </div>
        );

        lastLineIndex = offset + fullMatch.length;
      });

      if (lastLineIndex < line.length) {
        parts.push(line.substring(lastLineIndex));
      }

      parts.push(<br key={`br-${lineIndex}`} />);
    });

    return parts;
  };

  return (
    <div className='break-words break-all'>
      <article ref={contentRef} className={cn('overflow-hidden', isExpanded ? '' : 'line-clamp-3')}>
        {renderContent(content)}
      </article>
      {isOverflowing && (
        <button onClick={toggleReadMore} className='text-blue-500 text-xs hover:underline mt-2'>
          {isExpanded ? 'Küçült' : 'Devamını Oku'}
        </button>
      )}
    </div>
  );
};

export default Content;
