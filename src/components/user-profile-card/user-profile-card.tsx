import { Calendar } from 'lucide-react';
import { User } from '@prisma/client';
import UserAvatar from '@/components/user-avatar/user-avatar';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface UserProfileCardProps {
  user: Partial<User>;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  user: { profilePhoto, displayName, username, bio, website },
}) => {
  const t = useTranslations('userProfileCard');
  return (
    <div className='lg:p-6 flex flex-col p-2 min-w-full self-start md:border rounded'>
      <div className='flex justify-between'>
        <div className='flex items-start'>
          <UserAvatar
            user={{
              profilePhoto: profilePhoto ?? '',
              displayName: displayName ?? '',
              username: username ?? '',
            }}
          />
          <div className='flex flex-col ml-2'>
            <h2 className='text-sm font-bold'>{displayName}</h2>
            <p className='text-xs text-muted-foreground'>@{username}</p>
          </div>
        </div>
        <div>
          {/* TODO: Add logic to show button if user is not himself */}
          {/* TODO: Add logic to toggle button if user is already following */}
          {/* TODO: Add logic to call follow/unfollow endpoint */}
          <Button className='rounded-2xl bg-primary h-8'>
            <span className='text-sm bold '>{t('follow')}</span>
          </Button>
        </div>
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
            <Calendar className='h-4 w-4 mr-1' /> <span>Date Joined</span>
          </p>
        </div>
        <div className='flex flex-row min-w-full items-center mt-5'>
          <p className='flex mr-4'>
            <span className='text-sm text-muted-foreground mr-1'>{t('posts')}: </span>
            <span className='text-sm text-muted-foreground cursor-pointer hover:underline font-bold'>
              10
            </span>
          </p>
          <p className='flex mr-4'>
            <span className='text-sm text-muted-foreground mr-1'>{t('following')}: </span>
            <span className='text-sm text-muted-foreground cursor-pointer hover:underline font-bold'>
              10
            </span>
          </p>
          <p className='flex mr-4'>
            <span className='text-sm text-muted-foreground mr-1'>{t('followers')}: </span>
            <span className='text-sm text-muted-foreground cursor-pointer hover:underline font-bold'>
              10
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard;
