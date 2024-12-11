import React from 'react';

import { useDispatch, useSelector } from 'react-redux';

import TooltipWithEllipsis from '@/components/tooltip-with-ellipsis/tooltip-with-ellipsis';
import { TrendingUp } from 'lucide-react';

import { toggleHamburgerMenuOpen } from '@/store/reducers/ui-reducer/ui-slice';
import contextReducerSelector from '@/store/reducers/context-reducer/context-reducer-selector';

import { TrendingTopicsType } from '@/services/tag-service/constants';
import tagService from '@/services/tag-service/tag-service';
import { TagsEnum } from '@/services/firebase-service/types/db-types/tag';

interface TrendingTopicsProps {
  trends: TrendingTopicsType;
}

const TrendingTopics: React.FC<TrendingTopicsProps> = ({ trends }) => {
  const isMobile = useSelector(contextReducerSelector.getIsMobile);
  const dispatch = useDispatch();

  const handleTagClick = (tag: string): void => {
    if (isMobile) {
      dispatch(toggleHamburgerMenuOpen());
    }

    tagService.navigateToPageByTagName(tag);
  };
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
              <span
                onClick={() => handleTagClick(`$${stock.ticker}`)}
                className='max-w-[180px] truncate flex'
              >
                {index + 1}.&nbsp;
                <TooltipWithEllipsis
                  tooltipText={`$${stock.ticker}`}
                  maxWidth='170'
                  className='hover:underline'
                  tooltipSide='bottom'
                />
              </span>
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
                onClick={() => handleTagClick(tag.tagName)}
                className='max-w-[180px] truncate flex'
              >
                {index + 1}.&nbsp;
                <TooltipWithEllipsis
                  tooltipText={`${TagsEnum.HASHTAG}${tag.tagName}`}
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
