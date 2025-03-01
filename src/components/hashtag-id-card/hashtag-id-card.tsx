'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface HashtagIdCardProps {
  tagName: string;
  postCount: string;
  onClick?: () => void;
}

const HashtagIdCard: React.FC<HashtagIdCardProps> = ({ tagName, postCount, onClick }) => {
  return (
    <div
      onClick={onClick}
      className='flex items-center justify-between rounded-md hover:bg-muted cursor-pointer'
    >
      <div className='flex items-center'>
        <Avatar>
          <AvatarFallback className='relative p-2.5 bg-accent rounded-full'>{'#'}</AvatarFallback>
        </Avatar>

        <div className='flex flex-col ml-2'>
          <p className='text-sm font-bold'>{tagName}</p>
        </div>
      </div>
      <span className='text-xs text-muted-foreground'>{postCount}</span>
    </div>
  );
};

export default HashtagIdCard;
