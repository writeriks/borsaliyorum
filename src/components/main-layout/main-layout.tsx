'use client';

import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { parse } from 'next-useragent';

import NavigationBar from '@/components/nav-bar/nav-bar';
import SideBarMenu from '@/components/side-bar-menu/side-bar-menu';
import LeftMainAd from '@/components/ad-tags/left-main-ad/left-main-ad';
import RightMainAd from '@/components/ad-tags/right-main-ad/right-main-ad';
import InnerLeftMainAd from '@/components/ad-tags/inner-left-main-ad/inner-left-main-ad';
import UserProfileOptions from '@/components/user-profile-options/user-profile-options';
import InnerTopAd from '@/components/ad-tags/inner-top-ad/inner-top-ad';

import { setIsMobile } from '@/store/reducers/context-reducer/context-slice';
import { Toaster } from '@/components/ui/sonner';
import useUINotification from '@/hooks/useUINotification';
import useUser from '@/hooks/useUser';
import { AuthModal } from '@/components/auth/auth-modal';
import uiReducerSelector from '@/store/reducers/ui-reducer/ui-reducer-selector';
import { setIsAuthModalOpen } from '@/store/reducers/ui-reducer/ui-slice';

const MainLayout = ({ children }: { children: React.ReactNode }): React.ReactNode => {
  const dispatch = useDispatch();

  useUINotification();
  useUser();

  const isAuthModalOpen = useSelector(uiReducerSelector.getIsAuthModalOpen);

  useEffect(() => {
    if (window) {
      dispatch(setIsMobile(parse(window.navigator.userAgent).isMobile));
    }
  }, [dispatch]);

  return (
    <>
      <LeftMainAd />
      <main className='flex-grow text-base'>
        <SideBarMenu />
        <NavigationBar />

        <div id='main-container' className='flex w-full flex-col md:flex-row lg:flex-row'>
          <div
            id='left-section'
            className='hidden md:flex md:min-w-64 lg:flex flex-col lg:min-w-64'
          >
            <UserProfileOptions />
            <InnerLeftMainAd />
          </div>

          <div
            id='right-section'
            className='flex flex-col h-full md:w-full lg:w-full border-1 border-black rounded-md'
          >
            <InnerTopAd />
            {children}
          </div>
        </div>
        <Toaster richColors />
      </main>

      <RightMainAd />
      <AuthModal
        isOpen={isAuthModalOpen}
        onAuthModalOpenChange={() => dispatch(setIsAuthModalOpen(!isAuthModalOpen))}
      />
    </>
  );
};

export default MainLayout;
