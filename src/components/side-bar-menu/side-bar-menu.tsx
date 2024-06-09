"use client";

import React from "react";

import { useSelector } from "react-redux";

import uiReducerSelector from "@/store/reducers/ui-reducer/ui-reducer-selector";

const SideBarMenu: React.FC = () => {
  const isHamburgerMenuOpen = useSelector(
    uiReducerSelector.getIsHamburgerMenuOpen
  );

  return (
    <div
      className={`fixed right-0 top-0 z-40 h-screen w-64 transform bg-red-800 transition-transform ease-in-out ${
        isHamburgerMenuOpen ? "translate-x-0" : "translate-x-64"
      }`}
    >
      <ul className="flex h-full flex-col items-center justify-center space-y-4">
        <li>
          <a href="/" className="text-white">
            Test
          </a>
        </li>
        <li>
          <a href="/" className="text-white">
            Log out
          </a>
        </li>
      </ul>
    </div>
  );
};

export default SideBarMenu;
