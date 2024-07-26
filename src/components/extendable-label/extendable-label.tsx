import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ExtendableLabelProps {
  content: string;
}

const ExtendableLabel: React.FC<ExtendableLabelProps> = ({ content }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleReadMore = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };
  return (
    <div className='break-words break-all'>
      <article className={cn('overflow-hidden', isExpanded ? '' : 'line-clamp-3')}>
        {content}
      </article>
      {content.length > 100 && (
        <button
          onClick={e => toggleReadMore(e)}
          className='text-blue-500 text-xs hover:underline mt-2'
        >
          {isExpanded ? 'Küçült' : 'Devamını Oku'}
        </button>
      )}
    </div>
  );
};

export default ExtendableLabel;
