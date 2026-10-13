import React from 'react';
import { UserConnection } from '@/components/user-connections-modal/user-connections-types';
import UserAvatar from '@/components/user-avatar/user-avatar';
import FollowButton from '@/components/follow-button/follow-button';
import { Button } from '@/components/ui/button';

interface UserConnectionsListProps {
  users: UserConnection[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  emptyMessage: string;
  navigateToUserProfile: (username: string) => void;
  toggleUserFollow: (userId: number, isFollowing: boolean) => void;
  loadingText: string;
  loadMoreText: string;
  currentUser: any;
}

const UserConnectionsList: React.FC<UserConnectionsListProps> = ({
  emptyMessage,
  hasMore,
  isLoading,
  loadMore,
  users,
  navigateToUserProfile,
  toggleUserFollow,
  loadMoreText,
  loadingText,
  currentUser,
}) => {
  return (
    <div className='max-h-[60vh] md:max-h-[70vh] overflow-y-auto'>
      <div className='h-[400px] overflow-y-auto'>
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
                    <p className='font-medium text-sm truncate w-[150px]'>{user.displayName}</p>
                    <p className='text-xs text-muted-foreground truncate w-[150px]'>
                      @{user.username}
                    </p>
                    {user.bio && (
                      <p className='text-xs text-muted-foreground mt-1 line-clamp-1 hidden sm:block'>
                        {user.bio}
                      </p>
                    )}
                  </div>
                </div>
                <div className='ml-2 flex-shrink-0'>
                  {user.userId !== currentUser?.userId && (
                    <FollowButton
                      isFollowing={user.isFollowing}
                      toggleFollow={() => toggleUserFollow(user.userId, user.isFollowing)}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <div className='mt-4 flex justify-center'>
            <Button variant='outline' onClick={loadMore} disabled={isLoading} className='w-full'>
              {isLoading ? loadingText : loadMoreText}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserConnectionsList;
