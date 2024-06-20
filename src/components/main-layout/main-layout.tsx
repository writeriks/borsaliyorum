"use client";

import React, { useEffect } from "react";

import { useDispatch } from "react-redux";

import { parse } from "next-useragent";

import NavigationBar from "@/components/nav-bar/nav-bar";
import SideBarMenu from "@/components/side-bar-menu/side-bar-menu";
import LeftMainAd from "@/components/ad-tags/left-main-ad/left-main-ad";
import RightMainAd from "@/components/ad-tags/right-main-ad/right-main-ad";

import { setIsMobile } from "@/store/reducers/context-reducer/context-slice";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (window) {
      dispatch(setIsMobile(parse(window.navigator.userAgent).isMobile));
    }
  }, [dispatch]);

  return (
    <>
      <LeftMainAd />

      <main className="flex-grow bg-blue-200 h-screen w-screen">
        <SideBarMenu />
        <NavigationBar />
        {children}
      </main>

      <RightMainAd />
    </>
  );
};

export default MainLayout;
