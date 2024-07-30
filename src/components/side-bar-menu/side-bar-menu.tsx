'use client';

import React from 'react';

import { useSelector } from 'react-redux';

import uiReducerSelector from '@/store/reducers/ui-reducer/ui-reducer-selector';
import UserProfileOptionsMobile from '@/components/user-profile-options/user-profile-options-mobile';
import { cn } from '@/lib/utils';

const SideBarMenu: React.FC = () => {
  const isHamburgerMenuOpen = useSelector(uiReducerSelector.getIsHamburgerMenuOpen);

  return (
    <div
      className={cn(
        'min-1500:hidden md:min-w-64 fixed right-0 top-0 z-50 h-screen w-64 transform dark:bg-background bg-white transition-transform ease-in-out',
        isHamburgerMenuOpen ? 'translate-x-0' : 'translate-x-64'
      )}
    >
      <ul className='flex h-full flex-col items-center space-y-4 '>
        <li className='mt-16'>
          <UserProfileOptionsMobile />
        </li>
      </ul>
    </div>
  );
};

export default SideBarMenu;
