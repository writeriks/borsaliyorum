'use client';

import { Calendar } from 'lucide-react';
import { Stock } from '@prisma/client';
import { formatStringDateToDDMMYYYY } from '@/utils/date-utils/date-utils';
import FollowButton from '@/components/follow-button/follow-button';

interface StockProfileCardProps {
  stock: Stock & { isFollowingStock: boolean };
}

const StockProfileCard: React.FC<StockProfileCardProps> = ({
  stock: { companyName, marketEntryDate, ticker, isFollowingStock },
}) => {
  return (
    <div className='lg:p-6 flex flex-col p-2 min-w-full self-start md:border rounded mb-2'>
      <div className='flex justify-between'>
        <div className='flex items-start'>
          <div className='flex flex-col ml-2'>
            <h2 className='text-sm font-bold'>{ticker}</h2>
            <p className='text-xs text-muted-foreground'>{companyName}</p>
          </div>
        </div>
        <div>
          {ticker && (
            <FollowButton isFollowing={isFollowingStock} toggleFollow={() => console.log('ANAN')} />
          )}
        </div>
      </div>
      <div className='flex flex-col justify-between w-full h-full'>
        <div className='flex-col mt-3'>
          {marketEntryDate && (
            <p className='flex mt-1 text-xs'>
              <Calendar className='h-4 w-4 mr-1' />
              <span>{formatStringDateToDDMMYYYY(marketEntryDate?.toString())}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockProfileCard;
