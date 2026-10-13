'use client';

import UserAvatar from '@/components/user-avatar/user-avatar';
import { useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';

interface UserIdCardProps {
  profilePhoto: string;
  displayName: string;
  username: string;
  className?: string;
  onClick?: () => void;
}

const UserIdCard: React.FC<UserIdCardProps> = ({
  profilePhoto,
  displayName,
  username,
  className,
  onClick,
}) => {
  const router = useRouter();

  return (
    <div className={cn('flex items-start', className)}>
      <UserAvatar
        onUserAvatarClick={() => (onClick ? onClick() : router.push(`/users/${username}`))}
        user={{
          profilePhoto,
          displayName,
          username,
        }}
      />
      <div className={cn('flex flex-col ml-2')} onClick={onClick}>
        <h2 className='text-sm font-bold'>{displayName}</h2>
        <p className='text-xs text-muted-foreground'>@{username}</p>
      </div>
    </div>
  );
};

export default UserIdCard;
