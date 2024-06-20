import contextReducerSelector from "@/store/reducers/context-reducer/context-reducer-selector";
import React from "react";
import { useSelector } from "react-redux";

const LeftMainAd = () => {
  const isMobile = useSelector(contextReducerSelector.getIsMobile);

  return (
    <>
      {!isMobile && (
        <div className="lg:flex lg:w-1/5 lg:min-h-screen bg-gray-200">
          <div className="flex items-center justify-center h-full w-full">
            <p className="text-center">Ad Space (Left)</p>
          </div>
        </div>
      )}
    </>
  );
};

export default LeftMainAd;
