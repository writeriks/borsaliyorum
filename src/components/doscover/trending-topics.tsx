import { Label } from '@/components/ui/label';
import { Tag } from '@/services/firebase-service/types/db-types/tag';
import { TrendingUp } from 'lucide-react';
import React from 'react';

interface TrendingTopicsProps {
  trends: Tag[];
}

const TrendingTopics: React.FC<TrendingTopicsProps> = ({ trends }) => {
  return (
    <section id='trending-topics' className='flex flex-col'>
      <div className='p-1 flex flex-col border rounded-lg '>
        <a href='/discover' className='text-lg pl-3 mb-2 cursor-pointer font-bold'>
          En Aktif Konular
        </a>
        <Label className='text-xs pl-3 mb-2 text-description'>
          Son 4 saatte en çok konuşulan konular
        </Label>
        {trends.map((trend, index) => (
          <p
            key={trend.tagId}
            className='flex justify-between items-center text-sm hover:bg-secondary/80 w-full font-bold cursor-pointer p-2'
          >
            <a
              href={
                trend.tagId[0] === '#' ? `/tags/${trend.tagId.slice(1)}` : `/stocks/${trend.tagId}`
              }
              className='block max-w-[180px] truncate'
            >
              {index + 1}. {trend.tagId}
            </a>
            <TrendingUp />
          </p>
        ))}
      </div>
    </section>
  );
};

export default TrendingTopics;
