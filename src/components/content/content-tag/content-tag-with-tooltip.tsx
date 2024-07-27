import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { tickers } from '@/tickers';

interface ContentTagWithTooltipProps {
  tag: string;
  lineIndex: number;
  offset: number;
}

const ContentTagWithTooltip: React.FC<ContentTagWithTooltipProps> = ({
  tag,
  lineIndex,
  offset,
}) => {
  const tickerDisplay = tickers.find(ticker => tag === `$${ticker.id}`)?.display ?? tag;

  return (
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
          <p>{tickerDisplay}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ContentTagWithTooltip;
