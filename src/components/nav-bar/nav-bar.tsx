'use client';

import React from 'react';

import { useDispatch, useSelector } from 'react-redux';

import {
  ActiveSideBar,
  setActiveSideBar,
  toggleHamburgerMenuOpen,
} from '@/store/reducers/ui-reducer/ui-slice';

import useUser from '@/hooks/useUser';
import uiReducerSelector from '@/store/reducers/ui-reducer/ui-reducer-selector';
import { cn } from '@/lib/utils';
import { useRouter } from '@/i18n/routing';
import { SearchModal } from '@/components/modal/search-modal';

const NavigationBar = (): React.ReactNode => {
  const dispatch = useDispatch();

  const router = useRouter();
  const { currentUser } = useUser();

  const isHamburgerMenuOpen = useSelector(uiReducerSelector.getIsHamburgerMenuOpen);

  const handleClickHamburgerMenu = (): void => {
    dispatch(toggleHamburgerMenuOpen());
    dispatch(setActiveSideBar(ActiveSideBar.PROFILE));
  };

  return (
    <nav className='h-[60px] min-w-full p-4 sticky bg-background top-0 z-50 border-1 border-black overflow-hidden'>
      <div className='container mx-auto flex items-center justify-between lg:justify-stretch'>
        <div className='cursor-pointer' onClick={() => router.push('/feed')}>
          LOGO
        </div>
        {currentUser?.username && (
          <div className='hidden lg:flex lg:w-[870px] max-1500:w-[750px]  max-1250:w-[700px] max-1170:w-[600px] max-1500:justify-self-start lg:ml-44'>
            <SearchModal />
          </div>
        )}
        <div id='hamburger-menu' className='z-40 lg:hidden'>
          <button
            title='hamburger menu'
            className='transform transition duration-300 ease-in-out'
            onClick={() => handleClickHamburgerMenu()}
          >
            <svg
              className={cn(
                'h-6 w-6 transform transition-transform',
                isHamburgerMenuOpen ? '-rotate-90' : ''
              )}
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
              xmlns='http://www.w3.org/2000/svg'
            >
              {isHamburgerMenuOpen ? (
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              ) : (
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M4 6h16M4 12h16M4 18h16'
                />
              )}
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
