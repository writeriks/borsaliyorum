"use client";

import React from "react";

import { useSelector } from "react-redux";

import uiReducerSelector from "@/store/reducers/ui-reducer/ui-reducer-selector";
import UserProfileOptions from "@/components/user-profile-options/user-profile-options";

const SideBarMenu: React.FC = () => {
  const isHamburgerMenuOpen = useSelector(
    uiReducerSelector.getIsHamburgerMenuOpen
  );

  return (
    <div
      className={`md:hidden md:min-w-64 fixed right-0 top-0 z-40 h-screen w-64 transform bg-white dark:bg-slate-800 transition-transform ease-in-out ${
        isHamburgerMenuOpen ? "translate-x-0" : "translate-x-64"
      }`}
    >
      <ul className="flex h-full flex-col items-center space-y-4 border-2 border-secondary">
        <li className="mt-12">
          <UserProfileOptions />
        </li>
      </ul>
    </div>
  );
};

export default SideBarMenu;
