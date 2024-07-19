'use client';

import React, { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import UserAvatar from '@/components/user-avatar/user-avatar';
import PostEditor from '@/components/post-editor/post-editor';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TrendingDown, TrendingUp, X } from 'lucide-react';
import ImageUploader from '@/components/image-uploader/image-uploader';
import { User } from '@/services/firebase-service/types/db-types/user';

import { useDispatch, useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import { MediaData, Post } from '@/services/firebase-service/types/db-types/post';
import { Timestamp } from 'firebase/firestore';
import { useMutation } from '@tanstack/react-query';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { Icons } from '@/components/ui/icons';
import { MAX_CHARACTERS } from '@/services/api-service/post-api-service/constants';
import postApiService from '@/services/api-service/post-api-service/post-api-service';

const NewPost = (): React.ReactElement => {
  const [content, setcontent] = useState('');
  const [isBullish, setIsBullish] = useState(true);
  const [imageData, setImageData] = useState<string>('');
  const [cashTags, setCashTags] = useState<string[]>([]);

  const dispatch = useDispatch();
  const currentUser = useSelector(userReducerSelector.getUser);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = useSelector(userReducerSelector.getUser) as User;
  const mutation = useMutation({
    mutationFn: ({ post, postImageData }: { post: Post; postImageData: string }) =>
      postApiService.createNewPost(post, postImageData),
    onSuccess: () => {
      dispatch(
        setUINotification({
          message: 'Gönnderi başarıyla oluşturuldu.',
          notificationType: UINotificationEnum.SUCCESS,
        })
      );

      setcontent('');
      setCashTags([]);
      setIsBullish(true);
      setImageData('');
    },
    onError: () => {
      dispatch(
        setUINotification({
          message: 'Bir hata oluştu.',
          notificationType: UINotificationEnum.ERROR,
        })
      );
    },
  });

  const isSubmitDisabled = cashTags.length === 0 || mutation.isPending;

  const handleToggle = (): void => {
    setIsBullish(!isBullish);
  };

  const handleRemoveImage = (): void => {
    setImageData('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSetCashTags = (cashTag: string): void => {
    setCashTags([...cashTags, cashTag]);
  };

  useEffect(() => {
    cashTags.forEach(cashTag => {
      if (!content.includes(cashTag)) {
        const filteredCashTags = cashTags.filter(tag => tag !== cashTag);
        setCashTags(filteredCashTags);
      }
    });
  }, [cashTags, content]);

  const submitPost = async (): Promise<void> => {
    const post: Post = {
      userId: currentUser.userId,
      stockTickers: cashTags,
      createdAt: Timestamp.now(),
      content,
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
      isPositiveSentiment: isBullish,
      media: { src: '', alt: `${Date.now()}` } as MediaData,
    };
    mutation.mutate({ post, postImageData: imageData });
  };

  return (
    <div className='lg:p-6 flex p-2 rounded-lg shadow-lg w-full lg:w-3/4 self-start'>
      <div className='flex items-start w-10 lg:w-12'>
        <UserAvatar user={user} />
      </div>
      <div className='flex flex-col ml-2 w-full justify-between'>
        <div>
          <div className='flex'>
            <PostEditor
              content={content}
              setContent={setcontent}
              onSetCashTags={handleSetCashTags}
            />
            {content ? (
              <Label className='flex flex-col-reverse text-sm'>
                {MAX_CHARACTERS - content.length}
              </Label>
            ) : null}
          </div>
          <div className='relative w-full'>
            {imageData && (
              <>
                <Button
                  className='absolute top-1 right-1 p-1 bg-slate-800 hover:bg-slate-800 rounded-full text-white'
                  onClick={handleRemoveImage}
                >
                  <X size={30} />
                </Button>
                <Image
                  src={imageData}
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
            disabled={mutation.isPending}
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
            <ImageUploader
              fileInputRef={fileInputRef}
              onImageUpload={setImageData}
              disabled={mutation.isPending}
            />
            <Button
              className='flex items-center p-2 w-10 h-10 text-lg rounded-full '
              variant='default'
              disabled={mutation.isPending}
            >
              gif
            </Button>

            <Button
              className='flex items-center min-w-24 px-4 text-lg py-2 rounded-full'
              variant='default'
              onClick={submitPost}
              disabled={isSubmitDisabled}
            >
              {mutation.isPending ? (
                <>
                  <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                  <span>Gönderiliyor</span>
                </>
              ) : (
                <span>Gönder</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPost;
