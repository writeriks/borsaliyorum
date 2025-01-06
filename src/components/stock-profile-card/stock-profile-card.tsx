'use client';

import { Stock } from '@prisma/client';
import FollowButton from '@/components/follow-button/follow-button';
import { useMutation } from '@tanstack/react-query';
import stockApiService from '@/services/api-service/stock-api-service/stock-api-service';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import SymbolOverviewWidget from '@/components/widgets/symbol-overview-widget';

interface StockProfileCardProps {
  stock: Stock & { isFollowingStock: boolean };
}

const StockProfileCard: React.FC<StockProfileCardProps> = ({
  stock: { companyName, ticker, isFollowingStock },
}) => {
  const [isStockFollowed, setIsStockFollowed] = useState<boolean>(isFollowingStock);

  const dispatch = useDispatch();
  const handleError = (error: Error): void => {
    dispatch(
      setUINotification({
        message: error.message ?? 'Bir hata oluştu.',
        notificationType: UINotificationEnum.ERROR,
      })
    );
  };

  const followStockMutation = useMutation({
    mutationFn: async () => {
      return stockApiService.followStock(ticker);
    },
    onSuccess: () => {
      setIsStockFollowed(true);
    },
    onError: handleError,
  });

  const unfollowStockMutation = useMutation({
    mutationFn: async () => {
      return stockApiService.unfollowStock(ticker);
    },

    onSuccess: () => {
      setIsStockFollowed(false);
    },
    onError: handleError,
  });

  const toggleStockFollow = async (): Promise<void> => {
    if (isStockFollowed) {
      await unfollowStockMutation.mutateAsync();
    } else {
      await followStockMutation.mutateAsync();
    }
  };

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
            <FollowButton isFollowing={isStockFollowed} toggleFollow={toggleStockFollow} />
          )}
        </div>
      </div>
      <div className='flex flex-col justify-between w-full h-80'>
        <div className='flex-col mt-3 p-2'>
          <SymbolOverviewWidget ticker={ticker} />
        </div>
      </div>
    </div>
  );
};

export default StockProfileCard;
