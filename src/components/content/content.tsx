import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { TagsEnum } from '@/services/firebase-service/types/db-types/tag';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { tickers } from '@/tickers';

interface ContentProps {
  content: string;
}

const Content: React.FC<ContentProps> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    const element = contentRef.current;
    if (element) {
      setIsOverflowing(element.scrollHeight > element.clientHeight);
    }
  }, [content]);

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

      matches.forEach(match => {
        const [fullMatch, p1, p2, p3, p4] = match;
        const offset = match.index ?? 0;

        if (lastLineIndex < offset) {
          parts.push(line.substring(lastLineIndex, offset));
        }

        const symbol = fullMatch[0];
        const tag = symbol + (p2 || p3 || p4);

        parts.push(
          <div onClick={e => onTagClick(e, tag)}>
            {tag.startsWith('$') ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <strong
                      key={`${lineIndex}-${offset}`}
                      className='bg-slate-300 dark:bg-slate-700 font-thin'
                    >
                      {tag}
                    </strong>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tickers.find(ticker => tag === `$${ticker.id}`)?.display ?? tag}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <strong
                key={`${lineIndex}-${offset}`}
                className='bg-slate-300 dark:bg-slate-700 font-thin'
              >
                {tag}
              </strong>
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
