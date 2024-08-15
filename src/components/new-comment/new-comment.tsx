'use client';

import React, { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import UserAvatar from '@/components/user-avatar/user-avatar';
import ContentInput from '@/components/content-input/content-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TrendingDown, TrendingUp, X } from 'lucide-react';
import ImageUploader from '@/components/image-uploader/image-uploader';
import { User } from '@/services/firebase-service/types/db-types/user';

import { useDispatch, useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import { MediaData, Post } from '@/services/firebase-service/types/db-types/post';
import { useMutation } from '@tanstack/react-query';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { Icons } from '@/components/ui/icons';
import { MAX_CHARACTERS } from '@/services/api-service/post-api-service/constants';
import commentApiService from '@/services/api-service/comment-api-service/comment-api-service';
import { cn } from '@/lib/utils';
import { Comment } from '@/services/firebase-service/types/db-types/comment';
import useFetchContentOwner from '@/hooks/useFetchContentOwner';

interface NewCommentProps {
  post: Post;
  mention: {
    username: string;
  };
  onSubmit: (comment: Comment) => void;
}

const NewComment: React.FC<NewCommentProps> = ({ post, mention, onSubmit }) => {
  const postOwner = useFetchContentOwner(post.userId);

  const [content, setContent] = useState('');
  const [isBullish, setIsBullish] = useState(true);
  const [imageData, setImageData] = useState<string>('');
  const [cashTags, setCashTags] = useState<string[]>([]);

  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useSelector(userReducerSelector.getUser);

  useEffect(() => {
    if (postOwner) {
      setContent(`@(${postOwner.username}) `);
    }
  }, [postOwner]);

  const commentMutation = useMutation({
    mutationFn: ({ comment, postImageData }: { comment: Comment; postImageData: string }) =>
      commentApiService.createNewComment(comment, postImageData),
    onSuccess: (data: Comment) => {
      onSubmit(data);

      dispatch(
        setUINotification({
          message: 'Yorumunuz başarıyla oluşturuldu.',
          notificationType: UINotificationEnum.SUCCESS,
        })
      );

      setContent('');
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
  const isContentLengthExceeded = MAX_CHARACTERS - content.length < 0;
  const isSubmitDisabled =
    !!content.length && (commentMutation.isPending || isContentLengthExceeded);

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

  useEffect(() => {
    if (mention.username) {
      const mentionPrefix = `@(${mention.username})`;
      if (!content.includes(mentionPrefix)) {
        setContent(content + mentionPrefix + ' ');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mention]);

  const submitComment = async (): Promise<void> => {
    const comment: Comment = {
      userId: user.userId,
      postId: post.postId as string,
      content,
      isPositiveSentiment: isBullish,
      media: { src: '', alt: 'Kullanıcı resmi' } as MediaData,
      username: user.username,
    };
    commentMutation.mutate({ comment, postImageData: imageData });
  };

  return (
    <div className='lg:p-6 flex p-2 w-full self-start border bg-card rounded'>
      <div className='flex items-start w-10 lg:w-12'>
        <UserAvatar user={user} />
      </div>
      <div className='flex flex-col ml-2 w-full justify-between'>
        <div className='flex'>
          <ContentInput
            placeholder='Ne düşünüyorsun?'
            content={content}
            setContent={setContent}
            onSetCashTags={handleSetCashTags}
          />
          {content ? (
            <Label
              className={cn(
                'flex flex-col-reverse text-sm',
                isContentLengthExceeded ? 'text-destructive' : ''
              )}
            >
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

        <div className='flex justify-between items-center mt-3'>
          <Button
            id='is-bullish-toggle'
            className={`flex items-center px-4 py-2 text-lg rounded-full ml-1`}
            variant={isBullish ? 'bullish' : 'destructive'}
            onClick={handleToggle}
            disabled={commentMutation.isPending}
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
              disabled={commentMutation.isPending}
            />
            <Button
              className='flex items-center p-2 w-10 h-10 text-lg rounded-full '
              variant='default'
              disabled={commentMutation.isPending}
            >
              gif
            </Button>

            <Button
              className='flex items-center min-w-24 px-4 text-lg py-2 rounded-full'
              variant='default'
              onClick={submitComment}
              disabled={isSubmitDisabled}
            >
              {commentMutation.isPending ? (
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

export default NewComment;
