"use client";

import React, { useEffect } from "react";

import { useDispatch } from "react-redux";

import { parse } from "next-useragent";

import NavigationBar from "@/components/nav-bar/nav-bar";
import SideBarMenu from "@/components/side-bar-menu/side-bar-menu";
import LeftMainAd from "@/components/ad-tags/left-main-ad/left-main-ad";
import RightMainAd from "@/components/ad-tags/right-main-ad/right-main-ad";
import InnerLeftMainAd from "@/components/ad-tags/inner-left-main-ad/inner-left-main-ad";
import UserProfileOptions from "@/components/user-profile-options/user-profile-options";
import InnerTopAd from "@/components/ad-tags/inner-top-ad/inner-top-ad";

import { setIsMobile } from "@/store/reducers/context-reducer/context-slice";
import { Toaster } from "@/components/ui/sonner";
import useUINotification from "@/hooks/useUINotification";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();

  useUINotification();

  useEffect(() => {
    if (window) {
      dispatch(setIsMobile(parse(window.navigator.userAgent).isMobile));
    }
  }, [dispatch]);

  return (
    <>
      <LeftMainAd />
      <main className="flex-grow text-base">
        <SideBarMenu />
        <NavigationBar />

        <div id="main-container" className="flex w-full flex-col lg:flex-row">
          <div
            id="left-section"
            className="hidden md:flex md:min-w-64 lg:flex flex-col lg:min-w-64"
          >
            <UserProfileOptions />
            <InnerLeftMainAd />
          </div>

          <div
            id="right-section"
            className="flex flex-col h-full lg:w-full border-1 border-black rounded-md"
          >
            <InnerTopAd />
            {children}
          </div>
        </div>
        <Toaster richColors />
      </main>

      <RightMainAd />
    </>
  );
};

export default MainLayout;
