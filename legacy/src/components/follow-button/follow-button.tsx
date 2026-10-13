'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import React from 'react';

interface FollowButtonProps {
  isFollowing: boolean;
  toggleFollow: () => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({ isFollowing, toggleFollow }) => {
  const t = useTranslations('followButton');

  // Determine button label
  const buttonLabel = isFollowing ? t('unfollow') : t('follow');

  // TODO: Consider to update button styling
  return (
    <Button onClick={toggleFollow} className='rounded-2xl md:w-24 w-20 bg-primary h-8 font-bold'>
      <span className='text-xs md:text-sm bold'>{buttonLabel}</span>
    </Button>
  );
};

export default FollowButton;
