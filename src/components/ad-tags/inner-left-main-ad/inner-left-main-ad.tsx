import React from "react";

import { useSelector } from "react-redux";

import contextReducerSelector from "@/store/reducers/context-reducer/context-reducer-selector";

const InnerLeftMainAd = () => {
  const isMobile = useSelector(contextReducerSelector.getIsMobile);
  // make the call for ad if not mobile

  return (
    <div
      id="inner-left-ad-section"
      className="h-full bg-black flex items-center justify-center text-base"
    >
      <div className="h-96"></div>
      INNER LEFT AD SECTION
    </div>
  );
};

export default InnerLeftMainAd;
