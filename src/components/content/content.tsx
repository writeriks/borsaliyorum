import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import useOverflowDetection from '@/hooks/useOverflowDetection';
import ContentTagWithTooltip from '@/components/content/content-tag/content-tag-with-tooltip';
import ContentTag from '@/components/content/content-tag/content-tag';
import tagService from '@/services/tag-service/tag-service';

interface ContentProps {
  content: string;
}

const Content: React.FC<ContentProps> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isOverflowing, contentRef } = useOverflowDetection(content);

  const toggleReadMore = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const onTagClick = (e: React.MouseEvent<HTMLSpanElement>, tag: string): void => {
    e.stopPropagation();
    tagService.navigateToPageByTagName(tag);
  };

  const handleUrlClick = (url: string): void => {
    window.open(url, '_blank');
  };

  const renderContent = (text: string): React.ReactNode => {
    const tagRegex = /(\$\((.*?)\)|#\((.*?)\)|@\((.*?)\))/g;
    const urlRegex = /https?:\/\/[^\s]+/g;
    const parts: React.ReactNode[] = [];

    text.split('\n').forEach((line, lineIndex) => {
      const tagMatches = [...line.matchAll(tagRegex)];
      const urlMatches = [...line.matchAll(urlRegex)];
      const allMatches = [...tagMatches, ...urlMatches]
        .map(match => ({
          fullMatch: match[0], // Full matched text
          index: match.index ?? 0,
          isUrl: urlRegex.test(match[0]),
          displayText: match[0].startsWith('$')
            ? `$${match[2]}`
            : match[0].startsWith('#')
              ? `#${match[3]}`
              : match[0].startsWith('@')
                ? `@${match[4]}`
                : match[0], // For URLs, keep the full URL
        }))
        .sort((a, b) => a.index - b.index);

      let lastProcessedIndex = 0;

      allMatches.forEach((match, matchIndex) => {
        const { fullMatch, index, isUrl, displayText: tag } = match;

        if (lastProcessedIndex < index) {
          parts.push(line.substring(lastProcessedIndex, index)); // Push text before the match
        }

        parts.push(
          <span
            key={`${lineIndex}-${matchIndex}`}
            onClick={isUrl ? () => handleUrlClick(fullMatch) : e => onTagClick(e, tag)}
            style={{
              cursor: 'pointer',
              textDecoration: isUrl ? 'underline' : 'none',
            }}
          >
            {isUrl ? (
              <ContentTag tag={tag} lineIndex={lineIndex} offset={index} />
            ) : fullMatch.startsWith('$') ? (
              <ContentTagWithTooltip tag={tag} lineIndex={lineIndex} offset={index} />
            ) : (
              <ContentTag tag={tag} lineIndex={lineIndex} offset={index} />
            )}
          </span>
        );

        lastProcessedIndex = index + fullMatch.length;
      });

      if (lastProcessedIndex < line.length) {
        parts.push(line.substring(lastProcessedIndex)); // Push remaining text
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
