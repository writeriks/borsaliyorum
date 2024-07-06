'use client';

import React from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { toggleHamburgerMenuOpen } from '@/store/reducers/ui-reducer/ui-slice';

import uiReducerSelector from '@/store/reducers/ui-reducer/ui-reducer-selector';
import { cn } from '@/lib/utils';

const NavigationBar = (): React.ReactNode => {
  const dispatch = useDispatch();

  const isHamburgerMenuOpen = useSelector(uiReducerSelector.getIsHamburgerMenuOpen);

  return (
    <nav className='h-[60px] p-4 rounded-lg shadow-lg sticky bg-background top-0 z-50 border-1 border-black overflow-hidden'>
      <div className='container mx-auto flex items-center justify-between'>
        <a href='/'>LOGO</a>

        {/* Hamburger menu for mobile */}
        <div className='z-40 md:hidden'>
          <button
            title='hamburger menu'
            className='transform transition duration-300 ease-in-out'
            onClick={() => dispatch(toggleHamburgerMenuOpen())}
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
