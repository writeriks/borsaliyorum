"use client";

import React from "react";

const NavigationBar = () => {
  const [isHamburgerMenuOpen, setIsHamburgerMenuOpen] = React.useState(false);

  return (
    <nav className="h-[60px] bg-red-800 p-4">
      <div className="container mx-auto flex items-center justify-between">
        <a href="/my-portfolio" className="text-white">
          LOGO
        </a>

        {/* Hamburger menu for mobile */}
        <div className="z-50 md:hidden">
          <button
            title="hamburger menu"
            className="transform text-white transition duration-300 ease-in-out"
            onClick={() => setIsHamburgerMenuOpen(!isHamburgerMenuOpen)}
          >
            <svg
              className={`h-6 w-6 transform transition-transform ${
                isHamburgerMenuOpen ? "-rotate-90" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {isHamburgerMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        <div className={`hidden space-x-4 md:flex`}>
          <a href="/" className="text-md text-white">
            test
          </a>
          <a href="/" className="text-md text-white">
            Logout
          </a>
        </div>
      </div>
    </nav>
  );
};

export default NavigationBar;
