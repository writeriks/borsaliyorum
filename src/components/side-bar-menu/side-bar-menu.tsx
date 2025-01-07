'use client';

import React, { useEffect, useRef } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import uiReducerSelector from '@/store/reducers/ui-reducer/ui-reducer-selector';
import { cn } from '@/lib/utils';
import { ActiveSideBar, toggleHamburgerMenuOpen } from '@/store/reducers/ui-reducer/ui-slice';
import ProfileBar from '@/components/side-bar-menu/profile-bar/profile-bar';
import DiscoverBar from '@/components/side-bar-menu/discover-bar/discover-bar';

const SideBarMenu: React.FC = () => {
  const dispatch = useDispatch();
  const isHamburgerMenuOpen = useSelector(uiReducerSelector.getIsHamburgerMenuOpen);
  const activeSideBar = useSelector(uiReducerSelector.getActiveSideBar);

  const renderActiveSideBar = {
    [ActiveSideBar.PROFILE]: <ProfileBar />,
    [ActiveSideBar.DISCOVER]: <DiscoverBar />,
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHamburgerMenuOpen]);

  return (
    <div
      ref={sidebarRef}
      className={cn(
        'min-1500:hidden md:min-w-80 fixed right-0 top-[60px] z-50 h-screen w-80 transform dark:bg-background bg-white transition-transform ease-in-out',
        isHamburgerMenuOpen ? 'translate-x-0' : 'translate-x-80'
      )}
    >
      {renderActiveSideBar[activeSideBar]}
    </div>
  );
};

export default SideBarMenu;
