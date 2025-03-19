'use client';

import { Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatStringDateToDDMMYYYY } from '@/utils/date-utils/date-utils';
import FollowButton from '@/components/follow-button/follow-button';
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { useMutation } from '@tanstack/react-query';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { UserWithFollowers } from '@/services/user-service/user-types';
import UserIdCard from '@/components/user-profile-card/user-id-card';
import UserConnectionsModal from '@/components/user-connections-modal/user-connections-modal';
import { ConnectionType } from '@/components/user-connections-modal/user-connections-types';

interface UserProfileCardProps {
  user: UserWithFollowers;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  user: {
    profilePhoto,
    displayName,
    username,
    bio,
    website,
    createdAt,
    userId,
    userFollowerCount,
    isProfileOwner,
    userFollowingCount,
    isFollowingUser,
  },
}) => {
  const t = useTranslations('userProfileCard');

  const [isUserFollowed, setIsUserFollowed] = useState<boolean>(isFollowingUser);
  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState<boolean>(false);
  const [activeConnectionTab, setActiveConnectionTab] = useState<ConnectionType>(
    ConnectionType.FOLLOWERS
  );

  const dispatch = useDispatch();
  const handleError = (error: Error): void => {
    dispatch(
      setUINotification({
        message: error.message ?? 'Bir hata oluştu.',
        notificationType: UINotificationEnum.ERROR,
      })
    );
  };

  const followUserMutation = useMutation({
    mutationFn: async () => {
      return userApiService.followUser(userId as number);
    },
    onSuccess: () => {
      setIsUserFollowed(true);
    },
    onError: handleError,
  });

  const unfollowUserMutation = useMutation({
    mutationFn: async () => {
      return userApiService.unfollowUser(userId as number);
    },
    onSuccess: () => {
      setIsUserFollowed(false);
    },
    onError: handleError,
  });

  const toggleUserFollow = async (): Promise<void> => {
    if (isUserFollowed) {
      await unfollowUserMutation.mutateAsync();
    } else {
      await followUserMutation.mutateAsync();
    }
  };

  const openFollowersModal = (): void => {
    setActiveConnectionTab(ConnectionType.FOLLOWERS);
    setIsConnectionsModalOpen(true);
  };

  const openFollowingModal = (): void => {
    setActiveConnectionTab(ConnectionType.FOLLOWING);
    setIsConnectionsModalOpen(true);
  };

  return (
    <div className='lg:p-6 flex flex-col p-2 min-w-full self-start md:border rounded'>
      <div className='flex justify-between'>
        <UserIdCard
          profilePhoto={profilePhoto ?? ''}
          displayName={displayName ?? ''}
          username={username ?? ''}
        />
        <div>
          {!isProfileOwner && userId && (
            <FollowButton isFollowing={isUserFollowed} toggleFollow={toggleUserFollow} />
          )}
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
            <Calendar className='h-4 w-4 mr-1' />
            <span>{formatStringDateToDDMMYYYY(createdAt?.toString() ?? '')}</span>
          </p>
        </div>
        <div className='flex flex-row min-w-full items-center mt-5'>
          <p className='flex mr-4'>
            <span className='text-sm text-muted-foreground mr-1'>{t('followers')}: </span>
            <span
              className='text-sm text-muted-foreground cursor-pointer hover:underline font-bold'
              onClick={openFollowersModal}
            >
              {userFollowerCount}
            </span>
          </p>
          <p className='flex mr-4'>
            <span className='text-sm text-muted-foreground mr-1'>{t('following')}: </span>
            <span
              className='text-sm text-muted-foreground cursor-pointer hover:underline font-bold'
              onClick={openFollowingModal}
            >
              {userFollowingCount}
            </span>
          </p>
        </div>
      </div>

      {userId && isConnectionsModalOpen && (
        <UserConnectionsModal
          userId={userId}
          isOpen={isConnectionsModalOpen}
          onClose={() => setIsConnectionsModalOpen(false)}
          followerCount={userFollowerCount}
          followingCount={userFollowingCount}
          initialTab={activeConnectionTab}
        />
      )}
    </div>
  );
};

export default UserProfileCard;
