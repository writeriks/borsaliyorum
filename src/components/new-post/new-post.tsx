"use client";

import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import useUser from "@/hooks/useUser";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { Button } from "@/components/ui/button";

const NewPost = () => {
  const [idea, setIdea] = useState("");
  const [isBullish, setIsBullish] = useState(true);

  // TODO replace hook with redux selector. Get user from redux
  const user = useUser();
  const profileImage = user?.profilePhoto;
  const proxyUrl = `/api/imageProxy?imageUrl=${encodeURIComponent(
    profileImage as string
  )}`;

  const initials = user?.displayName
    .split(" ")
    .map((n) => n[0])
    .join("");

  const handleToggle = () => {
    setIsBullish(!isBullish);
  };

  return (
    <div className="lg:p-6 flex p-2 rounded-lg shadow-lg w-full lg:w-3/4 self-start">
      {/* LEFT */}
      <div className="flex items-start w-10 lg:w-12">
        <Avatar>
          <AvatarImage
            className="rounded-full"
            src={proxyUrl}
            alt="profile picture"
          />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>

      {/* RIGHT */}
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
              title="upload image"
              className="flex items-center p-1 w-8 h-8 rounded-full"
              variant="default"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="24px"
                viewBox="0 0 24 24"
                width="24px"
                fill="#4F46E5"
              >
                <path d="M0 0h24v24H0V0z" fill="none" />
                <path d="M21.02 5H19V2.98c0-.54-.44-.98-.98-.98h-.03c-.55 0-.99.44-.99.98V5h-2.01c-.54 0-.98.44-.99.98v.03c0 .55.44.99.99.99H17v2.01c0 .54.44.99.99.98h.03c.54 0 .98-.44.98-.98V7h2.02c.54 0 .98-.44.98-.98v-.04c0-.54-.44-.98-.98-.98zM16 9.01V8h-1.01c-.53 0-1.03-.21-1.41-.58-.37-.38-.58-.88-.58-1.44 0-.36.1-.69.27-.98H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8.28c-.3.17-.64.28-1.02.28-1.09-.01-1.98-.9-1.98-1.99zM15.96 19H6c-.41 0-.65-.47-.4-.8l1.98-2.63c.21-.28.62-.26.82.02L10 18l2.61-3.48c.2-.26.59-.27.79-.01l2.95 3.68c.26.33.03.81-.39.81z" />
              </svg>
            </Button>
            <Button
              title="test"
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
