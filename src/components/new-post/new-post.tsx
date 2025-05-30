'use client';

import React, { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import UserAvatar from '@/components/user-avatar/user-avatar';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Minus, TrendingDown, TrendingUp, X } from 'lucide-react';
import ImageUploader from '@/components/image-uploader/image-uploader';

import { useDispatch, useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';

import { useMutation } from '@tanstack/react-query';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { Icons } from '@/components/ui/icons';
import { MAX_CHARACTERS } from '@/services/api-service/post-api-service/constants';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import { cn } from '@/lib/utils';
import ContentInput from '@/components/content-input/content-input';
import { Sentiment } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import UrlContentPreview from '@/components/content-preview/content-preview';

interface NewPostProps {
  ticker?: string;
}

const NewPost: React.FC<NewPostProps> = ({ ticker }) => {
  const [content, setContent] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment>(Sentiment.bullish);
  const [imageData, setImageData] = useState<string>('');
  const [cashTags, setCashTags] = useState<string[]>([]);
  const t = useTranslations();

  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useSelector(userReducerSelector.getUser);
  const mutation = useMutation({
    mutationFn: ({
      post,
      postImageData,
    }: {
      post: { content: string; sentiment: Sentiment };
      postImageData: string;
    }) => postApiService.createNewPost(post, postImageData),
    onSuccess: () => {
      dispatch(
        setUINotification({
          message: t('NewPost.successMessage'),
          notificationType: UINotificationEnum.SUCCESS,
        })
      );

      setContent('');
      setCashTags([]);
      setSentiment(Sentiment.bullish);
      setImageData('');
    },
    onError: error => {
      dispatch(
        setUINotification({
          message: error.message ?? t('Common.errorMessage'),
          notificationType: UINotificationEnum.ERROR,
        })
      );
    },
  });

  const isContentLengthExceeded = MAX_CHARACTERS - content.length < 0;
  const isSubmitDisabled = cashTags.length === 0 || mutation.isPending || isContentLengthExceeded;

  const handleSentimentToggle = (): void => {
    switch (sentiment) {
      case Sentiment.bullish:
        setSentiment(Sentiment.bearish);
        break;
      case Sentiment.bearish:
        setSentiment(Sentiment.neutral);
        break;
      case Sentiment.neutral:
        setSentiment(Sentiment.bullish);
        break;
      default:
        break;
    }
  };
  const getVariantForSentiment = (): 'bullish' | 'destructive' | 'secondary' => {
    switch (sentiment) {
      case Sentiment.bullish:
        return 'bullish';
      case Sentiment.bearish:
        return 'destructive';
      case Sentiment.neutral:
      default:
        return 'secondary';
    }
  };

  const renderSentiment = {
    [Sentiment.bullish]: <TrendingUp />,
    [Sentiment.bearish]: <TrendingDown />,
    [Sentiment.neutral]: <Minus />,
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
    if (ticker) {
      const mentionPrefix = `$(${ticker})`;
      if (!content.includes(mentionPrefix)) {
        setCashTags([...cashTags, ticker]);
        setContent(content + mentionPrefix + ' ');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const submitPost = async (): Promise<void> => {
    const post = {
      content,
      sentiment,
    };
    mutation.mutate({ post, postImageData: imageData });
  };

  const router = useRouter();

  return (
    <div className='lg:p-6 flex p-2 w-full self-start md:border rounded'>
      <div className='flex items-start w-10 lg:w-12'>
        {user && (
          <UserAvatar
            onUserAvatarClick={() => router.push(`/users/${user?.username}`)}
            user={{
              profilePhoto: user.profilePhoto ?? '',
              displayName: user.displayName,
              username: user.username,
            }}
          />
        )}
      </div>
      <div className='flex flex-col ml-2 w-full justify-between'>
        <div className='flex'>
          <ContentInput
            placeholder={t('Common.placeholder')}
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
                alt={t('NewPost.uploadedAlt')}
                className='w-full max-h-80 object-cover rounded-lg'
              />
            </>
          )}
        </div>

        <div className='relative w-full'>
          <UrlContentPreview content={content} />
        </div>

        <div className='flex justify-between items-center mt-3'>
          <Button
            id='sentiment-toggle'
            className={`flex h-8 items-center px-2 py-2 text-lg rounded-full ml-1`}
            variant={getVariantForSentiment()}
            onClick={() => handleSentimentToggle()}
            disabled={mutation.isPending}
          >
            {renderSentiment[sentiment]}
          </Button>
          <div className='flex h-8 space-x-2'>
            <ImageUploader
              fileInputRef={fileInputRef}
              onImageUpload={setImageData}
              disabled={mutation.isPending}
            />
            <Button
              className='flex h-8 items-center p-2 w-8 text-sm font-bold rounded-full '
              variant='default'
              disabled={mutation.isPending}
            >
              {t('NewPost.gif')}
            </Button>

            <Button
              className='flex bg-bluePrimary h-8 items-center px-4 text-sm text-white font-bold py-2 rounded-full'
              variant='default'
              onClick={submitPost}
              disabled={isSubmitDisabled}
            >
              {mutation.isPending ? (
                <>
                  <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                  <span>{t('NewPost.sending')}</span>
                </>
              ) : (
                <span>{t('NewPost.send')}</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewPost;
