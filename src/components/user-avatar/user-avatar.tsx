import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';

const UserAvatar = (): React.ReactNode => {
  const user = useSelector(userReducerSelector.getUser);
  const profileImage = user?.profilePhoto;
  const proxyUrl = `/api/imageProxy?imageUrl=${encodeURIComponent(profileImage as string)}`;

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
