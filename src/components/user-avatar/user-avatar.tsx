import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@/services/firebase-service/types/db-types/user';

interface UserAvatarProps {
  user: User;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user }) => {
  const profileImage = user?.profilePhoto;
  const proxyUrl = `/api/image-proxy?imageUrl=${encodeURIComponent(profileImage as string)}`;

  const initials = user?.displayName
    .split(' ')
    .map(n => n[0])
    .join('');

  return (
    <Avatar>
      <AvatarImage className='rounded-full' src={proxyUrl} alt='profile picture' />
      <AvatarFallback className='relative p-2.5 bg-secondary rounded-full'>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
