import TooltipWithEllipsis from '@/components/tooltip-with-ellipsis/tooltip-with-ellipsis';
import { TrendingTopicsType } from '@/services/tag-service/constants';
import { toggleHamburgerMenuOpen } from '@/store/reducers/ui-reducer/ui-slice';
import { TrendingUp } from 'lucide-react';
import React from 'react';
import { useDispatch } from 'react-redux';

interface TrendingTopicsProps {
  trends: TrendingTopicsType;
}

const TrendingTopics: React.FC<TrendingTopicsProps> = ({ trends }) => {
  const dispatch = useDispatch();
  return (
    <div id='discovery'>
      <section id='trending-stocks' className='flex flex-col mb-2'>
        <div className='p-1 flex flex-col md:border rounded-lg '>
          <span className='text-lg pl-3 mb-2 font-bold'>En Aktif Hisseler 🔥</span>
          {trends.mostActiveStocks.map((stock, index) => (
            <p
              key={stock.stockId}
              className='flex justify-between items-center text-sm hover:bg-secondary/80 w-full font-bold cursor-pointer p-2'
            >
              <a
                onClick={() => dispatch(toggleHamburgerMenuOpen())}
                href={`/stocks/${stock.ticker}`}
                className='max-w-[180px] truncate flex'
              >
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
        <div className='p-1 flex flex-col md:border rounded-lg '>
          <span className='text-lg pl-3 mb-2 font-bold'>En Aktif Konular 🔥</span>
          {trends.mostActiveTags.map((tag, index) => (
            <p
              key={tag.tagId}
              className='flex justify-between items-center text-sm hover:bg-secondary/80 w-full font-bold cursor-pointer p-2'
            >
              <a
                onClick={() => dispatch(toggleHamburgerMenuOpen())}
                href={`/tags/${tag.tagName.slice(1)}`}
                className='max-w-[180px] truncate flex'
              >
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
