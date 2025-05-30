import TooltipWithEllipsis from '@/components/tooltip-with-ellipsis/tooltip-with-ellipsis';
import { useRouter } from '@/i18n/routing';
import { formatDateToTimeAgoString } from '@/utils/date-utils/date-utils';
import { User } from '@prisma/client';
import React, { useMemo } from 'react';

interface EntryOwnerProps {
  entryOwner: Partial<User & { isUserFollowed: boolean }>;
  entryDate: Date;
}

const EntryOwner: React.FC<EntryOwnerProps> = ({ entryOwner, entryDate }) => {
  const date = useMemo(() => {
    return formatDateToTimeAgoString(entryDate.toString());
  }, [entryDate]);

  const router = useRouter();

  return (
    <div className='space-y-1 flex-1'>
      <div className='text-sm font-bold'>
        <span
          className='hover:underline cursor-pointer'
          onClick={() => router.push(`/users/${entryOwner?.username}`)}
        >
          {entryOwner?.displayName}
        </span>
      </div>
      <div className='text-xs text-muted-foreground'>
        <span
          className='hover:underline cursor-pointer'
          onClick={() => router.push(`/users/${entryOwner?.username}`)}
        >
          <span className='mr-1'>{entryOwner?.username}</span>
        </span>

        {date?.fullDate && (
          <>
            <span className='font-bold'> · </span>
            <TooltipWithEllipsis tooltipText={date.fullDate}>
              <span className='ml-1 hover:underline'>{`${date.displayDate}`}</span>
            </TooltipWithEllipsis>
          </>
        )}
      </div>
    </div>
  );
};

export default EntryOwner;
