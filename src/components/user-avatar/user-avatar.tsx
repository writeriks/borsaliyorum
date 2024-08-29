import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';

interface UserAvatarProps {
  user: { profilePhoto: string | null; displayName: string; username: string };
  isClickAllowed?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user, isClickAllowed }) => {
  const router = useRouter();
  const profileImage = user.profilePhoto;
  const proxyUrl = `/api/image-proxy?imageUrl=${encodeURIComponent(profileImage as string)}`;

  const initials = user.displayName
    ?.split(' ')
    .map(n => n[0])
    .join('');

  return (
    <Avatar
      style={{ cursor: 'pointer' }}
      onClick={() => isClickAllowed && router.push(`/user/${user.username}`)}
    >
      <AvatarImage className='rounded-full' src={proxyUrl} alt='profile picture' />
      <AvatarFallback className='relative p-2.5 bg-accent rounded-full'>{initials}</AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
