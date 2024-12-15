'use client';

import { Button } from '@/components/ui/button';
import useUser from '@/hooks/useUser';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

interface FollowButtonProps {
  userIdToFollow: number;
}

const FollowButton: React.FC<FollowButtonProps> = ({ userIdToFollow: userId }) => {
  const t = useTranslations('followButton');

  const { fbAuthUser } = useUser();

  const dispatch = useDispatch();

  // Fetch if the user is followed
  const { data: isUserFollowedData } = useQuery({
    queryKey: [`get-entry-owner-${userId}`],
    queryFn: () => userApiService.getEntryOwner(userId),
    enabled: !!fbAuthUser, // Only run query if user is authenticated
  });

  const [isUserFollowed, setIsUserFollowed] = useState<boolean | undefined>(
    isUserFollowedData?.isUserFollowed
  );

  useEffect(() => {
    setIsUserFollowed(isUserFollowedData?.isUserFollowed);
  }, [isUserFollowedData]);

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
      return userApiService.followUser(userId);
    },
    onSuccess: () => {
      setIsUserFollowed(true);
    },
    onError: handleError,
  });

  const unfollowUserMutation = useMutation({
    mutationFn: async () => {
      return userApiService.unfollowUser(userId);
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

  // Do not render the button if `isUserFollowedData` is undefined
  if (isUserFollowed === undefined) {
    return null;
  }

  // Determine button label
  const buttonLabel = isUserFollowed ? t('unfollow') : t('follow');

  return (
    <Button onClick={toggleUserFollow} className='rounded-2xl bg-primary h-8 font-bold'>
      <span className='text-sm bold'>{buttonLabel}</span>
    </Button>
  );
};

export default FollowButton;
