"use client";

import React from "react";

import { useSelector } from "react-redux";

import uiReducerSelector from "@/store/reducers/ui-reducer/ui-reducer-selector";
import ThemeModeToggle from "@/components/theme-toggle/theme-toggle";

const SideBarMenu: React.FC = () => {
  const isHamburgerMenuOpen = useSelector(
    uiReducerSelector.getIsHamburgerMenuOpen
  );

  return (
    <div
      className={`fixed right-0 top-0 z-40 h-screen w-64 transform bg-zinc-500 transition-transform ease-in-out ${
        isHamburgerMenuOpen ? "translate-x-0" : "translate-x-64"
      }`}
    >
      <ul className="flex h-full flex-col items-center justify-center space-y-4">
        <li>
          <a href="/">Test</a>
        </li>
        <li>
          <a href="/">Log out</a>
        </li>
        <li>
          <ThemeModeToggle />
        </li>
      </ul>
    </div>
  );
};

export default SideBarMenu;
