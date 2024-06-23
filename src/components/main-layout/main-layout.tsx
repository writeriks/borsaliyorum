"use client";

import React, { useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";

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
import uiReducerSelector from "@/store/reducers/ui-reducer/ui-reducer-selector";
import { toast } from "sonner";
import {
  UINotificationEnum,
  setUINotification,
} from "@/store/reducers/ui-reducer/ui-slice";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const uiNotification = useSelector(uiReducerSelector.getUINotification);

  const { duration, message, notificationType, position } =
    uiNotification ?? {};

  useEffect(() => {
    if (message) {
      const otherProps = {
        duration: duration ?? 3000,
        position: position ?? "top-center",
      };

      switch (notificationType) {
        case UINotificationEnum.ERROR:
          toast.error(message, otherProps);
          break;

        case UINotificationEnum.WARNING:
          toast.warning(message, otherProps);
          break;

        case UINotificationEnum.SUCCESS:
          toast.success(message, otherProps);
          break;

        case UINotificationEnum.INFO:
          toast.info(message, otherProps);
          break;

        default:
          toast(message, otherProps);
      }
    }

    dispatch(
      setUINotification({
        message: "",
        notificationType: UINotificationEnum.DEFAULT,
      })
    );
  }, [dispatch, duration, message, notificationType, position]);

  useEffect(() => {
    if (window) {
      dispatch(setIsMobile(parse(window.navigator.userAgent).isMobile));
    }
  }, [dispatch]);

  return (
    <>
      <LeftMainAd />
      <main className="flex-grow  bg-black text-base text-white">
        <SideBarMenu />
        <NavigationBar />

        <div id="main-container" className="flex w-full flex-col lg:flex-row">
          <div
            id="left-section"
            className="hidden lg:flex flex-col lg:min-w-64"
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
