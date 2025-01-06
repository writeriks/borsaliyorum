'use client';

import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { parse } from 'next-useragent';

import NavigationBar from '@/components/nav-bar/nav-bar';
import SideBarMenu from '@/components/side-bar-menu/side-bar-menu';
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
import { setIsAuthModalOpen, setIsNewPostModalOpen } from '@/store/reducers/ui-reducer/ui-slice';
import Discover from '@/components/discover/discover';
import TabBarController from '@/components/tab-bar-controller/tab-bar-controller';
import NewPostTriggerMobile from '@/components/new-post/new-post-trigger-mobile';
import NewPostDialog from '@/components/new-post/new-post-dialog';
import { useRouter } from '@/i18n/routing';

const MainLayout = ({ children }: { children: React.ReactNode }): React.ReactNode => {
  useUINotification();

  const dispatch = useDispatch();
  const router = useRouter();

  const { currentUser } = useUser();

  const isAuthModalOpen = useSelector(uiReducerSelector.getIsAuthModalOpen);
  const isNewPostModalOpen = useSelector(uiReducerSelector.getIsNewPostModalOpen);
  const isHamburgerMenuOpen = useSelector(uiReducerSelector.getIsHamburgerMenuOpen);

  useEffect(() => {
    if (window) {
      dispatch(setIsMobile(parse(window.navigator.userAgent).isMobile));
    }
  }, [dispatch]);

  useEffect(() => {
    if (
      (currentUser?.email && window.location.pathname === '/tr') ||
      window.location.pathname === '/en'
    ) {
      router.push('/feed');
    }
  }, [currentUser, router]);

  return (
    <>
      <main className='flex-grow text-base'>
        <SideBarMenu />
        <NavigationBar />

        {isHamburgerMenuOpen && (
          <div className='bg-black bg-opacity-50 fixed z-40 w-screen h-screen'></div>
        )}

        <div id='main-container' className='flex w-full flex-col md:flex-row lg:flex-row'>
          <div
            id='left-section'
            className='hidden md:flex md:min-w-64 lg:flex flex-col lg:min-w-64 ml-2'
          >
            <UserProfileOptions />

            <div className='lg:flex min-1500:hidden top-[250px] sticky h-[260px] flex-col lg:min-w-64'>
              <Discover />
            </div>

            <InnerLeftMainAd />
          </div>

          <div
            id='right-section'
            className='flex flex-col h-full md:w-full lg:w-full border-1 border-black rounded-md'
          >
            <InnerTopAd />
            {children}

            <NewPostDialog
              isOpen={isNewPostModalOpen}
              onNewPostModalOpenChange={() => dispatch(setIsNewPostModalOpen(!isNewPostModalOpen))}
            />

            {currentUser?.email && (
              <div className='md:hidden'>
                <div className='bottom-[60px] right-0 fixed'>
                  <NewPostTriggerMobile />
                </div>
                <div className=' bottom-0 sticky'>
                  <TabBarController />
                </div>
              </div>
            )}
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
