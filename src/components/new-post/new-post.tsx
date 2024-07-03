"use client";

import React, { useState } from "react";

import UserAvatar from "@/components/user-avatar/user-avatar";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImagePlus } from "lucide-react";

const NewPost = () => {
  const [idea, setIdea] = useState("");
  const [isBullish, setIsBullish] = useState(true);

  const handleToggle = () => {
    setIsBullish(!isBullish);
  };

  return (
    <div className="lg:p-6 flex p-2 rounded-lg shadow-lg w-full lg:w-3/4 self-start">
      <div className="flex items-start w-10 lg:w-12">
        <UserAvatar />
      </div>

      <div className="flex flex-col ml-2 w-full justify-between">
        <Textarea
          className="lg:min-h-28"
          placeholder="$TUPRS - Ne düşünüyorsun"
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
        />
        <div className="flex justify-between mt-3">
          <Button
            className={`flex min-w-20 items-center px-4 py-2 h-8 rounded-full`}
            variant={isBullish ? "bullish" : "destructive"}
            onClick={handleToggle}
          >
            {isBullish ? "Yükselir" : "Düşer"}
          </Button>
          <div className="flex space-x-2">
            <Button
              className="flex items-center p-1 w-8 h-8 rounded-full"
              variant="default"
            >
              <ImagePlus />
            </Button>
            <Button
              className="flex items-center p-2 w-8 h-8 rounded-full "
              variant="default"
            >
              gif
            </Button>

            <Button
              className={`flex items-center min-w-24 px-4 py-2 h-8 rounded-full `}
              variant="default"
            >
              Gönder
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPost;
