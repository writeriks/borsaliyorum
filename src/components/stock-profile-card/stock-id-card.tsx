'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface StockIdCardProps {
  ticker: string;
  companyName: string;
  onClick?: () => void;
}

const StockIdCard: React.FC<StockIdCardProps> = ({ ticker, companyName, onClick }) => {
  return (
    <div className='flex items-center justify-between rounded-md hover:bg-muted cursor-pointer'>
      <div className='flex items-center' onClick={onClick}>
        <Avatar>
          <AvatarFallback className='relative p-2.5 bg-accent rounded-full'>
            {ticker.toString().substring(0, 1)}
          </AvatarFallback>
        </Avatar>

        <div className='flex flex-col ml-2'>
          <p className='text-sm font-bold'>{ticker}</p>
          <p className='text-xs text-muted-foreground'>{companyName}</p>
        </div>
      </div>
    </div>
  );
};

export default StockIdCard;
