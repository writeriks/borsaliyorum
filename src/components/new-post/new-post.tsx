'use client';

import React, { useRef, useState } from 'react';

import Image from 'next/image';

import UserAvatar from '@/components/user-avatar/user-avatar';
import PostEditor from '@/components/post-editor/post-editor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TrendingDown, TrendingUp, X } from 'lucide-react';
import ImageUploader from '@/components/image-uploader/image-uploader';

const MAX_CHARACTERS = 1000;

const NewPost = (): React.ReactElement => {
  const [content, setcontent] = useState('');
  const [isBullish, setIsBullish] = useState(true);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggle = (): void => {
    setIsBullish(!isBullish);
  };

  const handleRemoveImage = (): void => {
    setImageSrc(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className='lg:p-6 flex p-2 rounded-lg shadow-lg w-full lg:w-3/4 self-start'>
      <div className='flex items-start w-10 lg:w-12'>
        <UserAvatar />
      </div>
      <div className='flex flex-col ml-2 w-full justify-between'>
        <div>
          <div className='flex'>
            <PostEditor content={content} setContent={setcontent} />
            {content ? (
              <Label className='flex flex-col-reverse text-sm'>
                {MAX_CHARACTERS - content.length}
              </Label>
            ) : null}
          </div>
          <div className='relative w-full'>
            {imageSrc && (
              <>
                <Button
                  className='absolute top-1 right-1 p-1 bg-slate-800 hover:bg-slate-800 rounded-full text-white'
                  onClick={handleRemoveImage}
                >
                  <X size={30} />
                </Button>
                <Image
                  src={imageSrc}
                  width={50}
                  height={50}
                  alt='uploaded'
                  className='w-full max-h-80 object-cover rounded-lg'
                />
              </>
            )}
          </div>
        </div>
        <div className='flex justify-between items-center mt-3'>
          <Button
            id='is-bullish-toggle'
            className={`flex items-center px-4 py-2 text-lg rounded-full ml-1`}
            variant={isBullish ? 'bullish' : 'destructive'}
            onClick={handleToggle}
          >
            {isBullish ? (
              <div className='flex items-center justify-between'>
                <TrendingUp />
              </div>
            ) : (
              <div className='flex items-center justify-between'>
                <TrendingDown />
              </div>
            )}
          </Button>
          <div className='flex space-x-2'>
            <ImageUploader fileInputRef={fileInputRef} onImageUpload={setImageSrc} />
            <Button
              className='flex items-center p-2 w-10 h-10 text-lg rounded-full '
              variant='default'
            >
              gif
            </Button>

            <Button
              className='flex items-center min-w-24 px-4 text-lg py-2 rounded-full'
              variant='default'
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
