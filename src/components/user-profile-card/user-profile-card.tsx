'use client';

import { Calendar } from 'lucide-react';
import { User } from '@prisma/client';
import UserAvatar from '@/components/user-avatar/user-avatar';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { formatStringDateToDDMMYYYY } from '@/utils/date-utils/date-utils';
import FollowButton from '@/components/follow-button/follow-button';

interface UserProfileCardProps {
  user: Partial<User>;
  userFollowerCount: number;
  userFollowingCount: number;
  isProfileOwner: boolean;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  user: { profilePhoto, displayName, username, bio, website, createdAt, userId },
  userFollowerCount,
  userFollowingCount,
  isProfileOwner,
}) => {
  const t = useTranslations('userProfileCard');
  const router = useRouter();

  return (
    <div className='lg:p-6 flex flex-col p-2 min-w-full self-start md:border rounded'>
      <div className='flex justify-between'>
        <div className='flex items-start'>
          <UserAvatar
            onUserAvatarClick={() => router.push(`/users/${username}`)}
            user={{
              profilePhoto: profilePhoto ?? null,
              displayName: displayName ?? '',
              username: username ?? '',
            }}
          />
          <div className='flex flex-col ml-2'>
            <h2 className='text-sm font-bold'>{displayName}</h2>
            <p className='text-xs text-muted-foreground'>@{username}</p>
          </div>
        </div>
        <div>{!isProfileOwner && userId && <FollowButton userIdToFollow={userId} />}</div>
      </div>
      <div className='flex flex-col justify-between w-full h-full'>
        <div className='flex-col mt-3'>
          <p className='flex mt-1 text-xs'>
            {t('bio')}:<span className='break-words break-all ml-1'>{bio ? bio : ''}</span>
          </p>
          <p className='flex mt-1 text-xs'>
            {t('website')}:
            <span className='break-words break-all ml-1'>{website ? website : ''}</span>
          </p>
          <p className='flex mt-1 text-xs'>
            <Calendar className='h-4 w-4 mr-1' />
            <span>{formatStringDateToDDMMYYYY(createdAt?.toString() ?? '')}</span>
          </p>
        </div>
        <div className='flex flex-row min-w-full items-center mt-5'>
          <p className='flex mr-4'>
            <span className='text-sm text-muted-foreground mr-1'>{t('following')}: </span>
            <span className='text-sm text-muted-foreground cursor-pointer hover:underline font-bold'>
              {userFollowingCount}
            </span>
          </p>
          <p className='flex mr-4'>
            <span className='text-sm text-muted-foreground mr-1'>{t('followers')}: </span>
            <span className='text-sm text-muted-foreground cursor-pointer hover:underline font-bold'>
              {userFollowerCount}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard;
