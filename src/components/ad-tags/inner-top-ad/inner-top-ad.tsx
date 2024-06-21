import React from "react";

import { useSelector } from "react-redux";

import contextReducerSelector from "@/store/reducers/context-reducer/context-reducer-selector";

const InnerTopAd = () => {
  const isMobile = useSelector(contextReducerSelector.getIsMobile);
  // make the call for ad if not mobile

  return (
    <div className="flex min-h-24 lg:min-h-44 bg-purple-400">Inner Top Ad</div>
  );
};

export default InnerTopAd;
