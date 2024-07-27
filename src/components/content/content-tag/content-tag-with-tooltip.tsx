import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { tickers } from '@/tickers';
import ContentTag from '@/components/content/content-tag/content-tag';

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
          <ContentTag tag={tag} lineIndex={lineIndex} offset={offset} />
        </TooltipTrigger>
        <TooltipContent>
          <p>{tickerDisplay}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ContentTagWithTooltip;
