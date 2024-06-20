import contextReducerSelector from "@/store/reducers/context-reducer/context-reducer-selector";
import React from "react";
import { useSelector } from "react-redux";

const RightMainAd = () => {
  const isMobile = useSelector(contextReducerSelector.getIsMobile);

  return (
    <>
      {!isMobile ? (
        <div className="lg:flex lg:w-1/5 min-h-screen bg-red-500">
          <div className="flex items-center justify-center h-full w-full">
            <p className="text-center">Ad Space (Right)</p>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default RightMainAd;
