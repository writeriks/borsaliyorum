import React from 'react';

import UserProfileOptionsMobile from '@/components/user-profile-options/user-profile-options-mobile';

const ProfileBar: React.FC = () => {
  return (
    <>
      <ul className='flex h-full w-full flex-col items-center space-y-4'>
        <li>
          <UserProfileOptionsMobile />
        </li>
      </ul>
    </>
  );
};

export default ProfileBar;
