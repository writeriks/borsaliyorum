'use client';

import React, { useEffect, useRef } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import uiReducerSelector from '@/store/reducers/ui-reducer/ui-reducer-selector';
import UserProfileOptionsMobile from '@/components/user-profile-options/user-profile-options-mobile';
import { cn } from '@/lib/utils';
import { toggleHamburgerMenuOpen } from '@/store/reducers/ui-reducer/ui-slice';

const SideBarMenu: React.FC = () => {
  const dispatch = useDispatch();
  const isHamburgerMenuOpen = useSelector(uiReducerSelector.getIsHamburgerMenuOpen);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent): void => {
    const hamburgerMenuElement = document.getElementById('hamburger-menu');
    if (
      !sidebarRef.current?.contains(event.target as Node) &&
      !hamburgerMenuElement?.contains(event.target as Node)
    ) {
      dispatch(toggleHamburgerMenuOpen());
    }
  };

  useEffect(() => {
    if (isHamburgerMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isHamburgerMenuOpen]);

  return (
    <div
      ref={sidebarRef}
      className={cn(
        'min-1500:hidden md:min-w-64 fixed right-0 top-0 z-50 h-screen w-64 transform dark:bg-background bg-white transition-transform ease-in-out',
        isHamburgerMenuOpen ? 'translate-x-0' : 'translate-x-64'
      )}
    >
      <ul className='flex h-full flex-col items-center space-y-4'>
        <li className='mt-16'>
          <UserProfileOptionsMobile />
        </li>
      </ul>
    </div>
  );
};

export default SideBarMenu;
