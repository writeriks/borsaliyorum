import TooltipWithEllipsis from '@/components/tooltip-with-ellipsis/tooltip-with-ellipsis';
import { TrendingTopicsType } from '@/services/tag-service/constants';
import { TrendingUp } from 'lucide-react';
import React from 'react';

interface TrendingTopicsProps {
  trends: TrendingTopicsType;
}

const TrendingTopics: React.FC<TrendingTopicsProps> = ({ trends }) => {
  return (
    <div id='discovery'>
      <section id='trending-stocks' className='flex flex-col mb-2'>
        <div className='p-1 flex flex-col border rounded-lg '>
          <a href='/discover' className='text-lg pl-3 mb-2 cursor-pointer font-bold'>
            En Aktif Hisseler 🔥
          </a>
          {trends.mostActiveStocks.map((stock, index) => (
            <p
              key={stock.stockId}
              className='flex justify-between items-center text-sm hover:bg-secondary/80 w-full font-bold cursor-pointer p-2'
            >
              <a href={`/stocks/${stock.ticker}`} className='max-w-[180px] truncate flex'>
                {index + 1}.&nbsp;
                <TooltipWithEllipsis
                  tooltipText={stock.ticker}
                  maxWidth='170'
                  className='hover:underline'
                  tooltipSide='bottom'
                />
              </a>
              <TrendingUp />
            </p>
          ))}
        </div>
      </section>
      <section id='trending-stocks' className='flex flex-col'>
        <div className='p-1 flex flex-col border rounded-lg '>
          <a href='/discover' className='text-lg pl-3 mb-2 cursor-pointer font-bold'>
            En Aktif Konular 🔥
          </a>
          {trends.mostActiveTags.map((tag, index) => (
            <p
              key={tag.tagId}
              className='flex justify-between items-center text-sm hover:bg-secondary/80 w-full font-bold cursor-pointer p-2'
            >
              <a href={`/tags/${tag.tagName.slice(1)}`} className='max-w-[180px] truncate flex'>
                {index + 1}.&nbsp;
                <TooltipWithEllipsis
                  tooltipText={tag.tagName}
                  maxWidth='170'
                  className='hover:underline'
                  tooltipSide='bottom'
                />
              </a>
              <TrendingUp />
            </p>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TrendingTopics;
