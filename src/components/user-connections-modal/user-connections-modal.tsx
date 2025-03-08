'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@/i18n/routing';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import UserAvatar from '@/components/user-avatar/user-avatar';
import FollowButton from '@/components/follow-button/follow-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserConnection {
  userId: number;
  username: string;
  displayName: string;
  profilePhoto: string | null;
  bio: string | null;
  isFollowing: boolean;
}

export enum ConnectionType {
  FOLLOWERS = 'followers',
  FOLLOWING = 'following',
}

interface UserConnectionsModalProps {
  userId: number;
  isOpen: boolean;
  onClose: () => void;
  followerCount: number;
  followingCount: number;
  initialTab?: ConnectionType;
}

const UserConnectionsModal: React.FC<UserConnectionsModalProps> = ({
  userId,
  isOpen,
  onClose,
  followerCount,
  followingCount,
  initialTab = ConnectionType.FOLLOWERS,
}) => {
  const t = useTranslations('userProfileCard');
  const router = useRouter();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState<ConnectionType>(initialTab);
  const [followers, setFollowers] = useState<UserConnection[]>([]);
  const [followings, setFollowings] = useState<UserConnection[]>([]);
  const [isLoadingFollowers, setIsLoadingFollowers] = useState<boolean>(false);
  const [isLoadingFollowings, setIsLoadingFollowings] = useState<boolean>(false);
  const [followersPage, setFollowersPage] = useState<number>(1);
  const [followingsPage, setFollowingsPage] = useState<number>(1);
  const [hasMoreFollowers, setHasMoreFollowers] = useState<boolean>(true);
  const [hasMoreFollowings, setHasMoreFollowings] = useState<boolean>(true);
  const limit = 10;

  const handleError = (error: Error): void => {
    dispatch(
      setUINotification({
        message: error.message ?? 'Bir hata oluştu.',
        notificationType: UINotificationEnum.ERROR,
      })
    );
  };

  const loadFollowers = async (pageNum: number): Promise<void> => {
    try {
      setIsLoadingFollowers(true);
      const response = await userApiService.getUserFollowers(userId, pageNum, limit);

      if (pageNum === 1) {
        setFollowers(response.followers);
      } else {
        setFollowers(prev => [...prev, ...response.followers]);
      }

      setHasMoreFollowers(pageNum < response.pagination.totalPages);
    } catch (error) {
      handleError(error as Error);
    } finally {
      setIsLoadingFollowers(false);
    }
  };

  const loadFollowings = async (pageNum: number): Promise<void> => {
    try {
      setIsLoadingFollowings(true);
      const response = await userApiService.getUserFollowings(userId, pageNum, limit);

      if (pageNum === 1) {
        setFollowings(response.followings);
      } else {
        setFollowings(prev => [...prev, ...response.followings]);
      }

      setHasMoreFollowings(pageNum < response.pagination.totalPages);
    } catch (error) {
      handleError(error as Error);
    } finally {
      setIsLoadingFollowings(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setFollowersPage(1);
      setFollowingsPage(1);

      if (initialTab === ConnectionType.FOLLOWERS) {
        loadFollowers(1);
      } else {
        loadFollowings(1);
      }
    }
  }, [isOpen, userId, initialTab]);

  useEffect(() => {
    if (
      isOpen &&
      activeTab === ConnectionType.FOLLOWERS &&
      followers.length === 0 &&
      !isLoadingFollowers
    ) {
      loadFollowers(1);
    } else if (
      isOpen &&
      activeTab === ConnectionType.FOLLOWING &&
      followings.length === 0 &&
      !isLoadingFollowings
    ) {
      loadFollowings(1);
    }
  }, [activeTab, isOpen]);

  const followUserMutation = useMutation({
    mutationFn: async (followUserId: number) => {
      return userApiService.followUser(followUserId);
    },
    onSuccess: (_, followUserId) => {
      // Update followers list
      setFollowers(prev =>
        prev.map(follower =>
          follower.userId === followUserId ? { ...follower, isFollowing: true } : follower
        )
      );

      // Update followings list
      setFollowings(prev =>
        prev.map(following =>
          following.userId === followUserId ? { ...following, isFollowing: true } : following
        )
      );
    },
    onError: handleError,
  });

  const unfollowUserMutation = useMutation({
    mutationFn: async (unfollowUserId: number) => {
      return userApiService.unfollowUser(unfollowUserId);
    },
    onSuccess: (_, unfollowUserId) => {
      // Update followers list
      setFollowers(prev =>
        prev.map(follower =>
          follower.userId === unfollowUserId ? { ...follower, isFollowing: false } : follower
        )
      );

      // Update followings list
      setFollowings(prev =>
        prev.map(following =>
          following.userId === unfollowUserId ? { ...following, isFollowing: false } : following
        )
      );
    },
    onError: handleError,
  });

  const toggleUserFollow = async (
    connectionUserId: number,
    isFollowing: boolean
  ): Promise<void> => {
    if (isFollowing) {
      await unfollowUserMutation.mutateAsync(connectionUserId);
    } else {
      await followUserMutation.mutateAsync(connectionUserId);
    }
  };

  const loadMoreFollowers = (): void => {
    if (!isLoadingFollowers && hasMoreFollowers) {
      const nextPage = followersPage + 1;
      setFollowersPage(nextPage);
      loadFollowers(nextPage);
    }
  };

  const loadMoreFollowings = (): void => {
    if (!isLoadingFollowings && hasMoreFollowings) {
      const nextPage = followingsPage + 1;
      setFollowingsPage(nextPage);
      loadFollowings(nextPage);
    }
  };

  const navigateToUserProfile = (username: string): void => {
    router.push(`/users/${username}`);
    onClose();
  };

  const renderUserList = (
    users: UserConnection[],
    isLoading: boolean,
    hasMore: boolean,
    loadMore: () => void,
    emptyMessage: string
  ): React.ReactNode => {
    return (
      <div className='max-h-[60vh] md:max-h-[70vh] overflow-y-auto'>
        {users.length === 0 && !isLoading ? (
          <div className='py-4 text-center text-muted-foreground'>{emptyMessage}</div>
        ) : (
          <ul className='space-y-3 px-0 sm:px-1'>
            {users.map(user => (
              <li
                key={user.userId}
                className='flex items-center justify-between p-2 hover:bg-muted/30 rounded-md'
              >
                <div
                  className='flex items-center gap-2 sm:gap-3 cursor-pointer flex-1 min-w-0'
                  onClick={() => navigateToUserProfile(user.username)}
                >
                  <UserAvatar
                    user={{
                      profilePhoto: user.profilePhoto,
                      displayName: user.displayName,
                      username: user.username,
                    }}
                    onUserAvatarClick={() => navigateToUserProfile(user.username)}
                  />
                  <div className='min-w-0 flex-1 overflow-hidden'>
                    <p className='font-medium text-sm truncate'>{user.displayName}</p>
                    <p className='text-xs text-muted-foreground truncate'>@{user.username}</p>
                    {user.bio && (
                      <p className='text-xs text-muted-foreground mt-1 line-clamp-1 hidden sm:block'>
                        {user.bio}
                      </p>
                    )}
                  </div>
                </div>
                <div className='ml-2 flex-shrink-0'>
                  <FollowButton
                    isFollowing={user.isFollowing}
                    toggleFollow={() => toggleUserFollow(user.userId, user.isFollowing)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <div className='mt-4 flex justify-center'>
            <Button variant='outline' onClick={loadMore} disabled={isLoading} className='w-full'>
              {isLoading ? t('loading') : t('loadMore')}
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-[95vw] sm:max-w-md md:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{t('connections')}</DialogTitle>
        </DialogHeader>

        <Tabs
          defaultValue={initialTab}
          value={activeTab}
          onValueChange={value => setActiveTab(value as ConnectionType)}
          className='w-full'
        >
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value={ConnectionType.FOLLOWERS}>
              {t('followers')} ({followerCount})
            </TabsTrigger>
            <TabsTrigger value={ConnectionType.FOLLOWING}>
              {t('following')} ({followingCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={ConnectionType.FOLLOWERS}>
            {renderUserList(
              followers,
              isLoadingFollowers,
              hasMoreFollowers,
              loadMoreFollowers,
              t('noFollowers')
            )}
          </TabsContent>

          <TabsContent value={ConnectionType.FOLLOWING}>
            {renderUserList(
              followings,
              isLoadingFollowings,
              hasMoreFollowings,
              loadMoreFollowings,
              t('noFollowing')
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default UserConnectionsModal;
