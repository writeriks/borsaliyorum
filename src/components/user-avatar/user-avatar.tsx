import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProps {
  user: { profilePhoto: string | null; displayName: string; username: string };
  onUserAvatarClick?: () => void;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user, onUserAvatarClick }) => {
  const profileImage = user.profilePhoto;
  const proxyUrl = profileImage
    ? `/api/image-proxy?imageUrl=${encodeURIComponent(profileImage)}`
    : undefined;

  const initials = user.displayName
    ?.split(' ')
    .map(n => n[0])
    .join('');

  return (
    <Avatar style={{ cursor: 'pointer' }} onClick={() => onUserAvatarClick?.()}>
      {proxyUrl ? (
        <AvatarImage className='rounded-full' src={proxyUrl} alt='profile picture' />
      ) : (
        <AvatarFallback className='relative p-2.5 bg-accent rounded-full'>
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  );
};

export default UserAvatar;
