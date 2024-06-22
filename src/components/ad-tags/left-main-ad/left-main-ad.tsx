import React from "react";

import { useSelector } from "react-redux";

import contextReducerSelector from "@/store/reducers/context-reducer/context-reducer-selector";

const LeftMainAd = () => {
  const isMobile = useSelector(contextReducerSelector.getIsMobile);
  // make the call for ad if not mobile
  return (
    <>
      <div className="hidden lg:flex lg:min-w-44 lg:min-h-screen bg-black text-base text-white">
        <div className="flex items-center justify-center h-full w-full">
          <p className="text-center">Ad Space (Left)</p>
        </div>
      </div>
    </>
  );
};

export default LeftMainAd;
