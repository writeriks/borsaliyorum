'use client';

import React, { useEffect, useRef, useState } from 'react';

import Image from 'next/image';

import UserAvatar from '@/components/user-avatar/user-avatar';
import ContentInput from '@/components/content-input/content-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import ImageUploader from '@/components/image-uploader/image-uploader';
import { X } from 'lucide-react';

import { useDispatch, useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import { useMutation, useQuery } from '@tanstack/react-query';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { Icons } from '@/components/ui/icons';
import { MAX_CHARACTERS } from '@/services/api-service/post-api-service/constants';
import commentApiService from '@/services/api-service/comment-api-service/comment-api-service';
import { cn } from '@/lib/utils';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { Comment } from '@prisma/client';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import UrlContentPreview from '@/components/content-preview/content-preview';

interface NewCommentProps {
  postOwnerId: number;
  postId: number;
  mention: {
    username: string;
  };
  onSubmit: (comment: Comment) => void;
}

const NewComment: React.FC<NewCommentProps> = ({ postOwnerId, postId, mention, onSubmit }) => {
  const { data: postOwner } = useQuery({
    queryKey: [`get-entry-owner-${postOwnerId}`],
    queryFn: async () => await userApiService.getEntryOwner(postOwnerId),
    enabled: !!postOwnerId,
  });

  const [content, setContent] = useState('');
  const [imageData, setImageData] = useState<string>('');
  const [cashTags, setCashTags] = useState<string[]>([]);

  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useSelector(userReducerSelector.getUser);

  const t = useTranslations('Common');

  useEffect(() => {
    if (postOwner) {
      setContent(`@(${postOwner.username}) `);
    }
  }, [postOwner]);

  const commentMutation = useMutation({
    mutationFn: ({
      comment,
      postImageData,
    }: {
      comment: { postId: number; content: string };
      postImageData: string;
    }) => commentApiService.createNewComment(comment, postImageData),
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
    const comment = {
      postId: postId,
      content,
    };
    commentMutation.mutate({ comment, postImageData: imageData });
  };

  const router = useRouter();
  return (
    <div className='lg:p-6 flex p-2 w-full self-start border bg-card rounded'>
      <div className='flex items-start w-10 lg:w-12'>
        <UserAvatar
          onUserAvatarClick={() => router.push(`/users/${user.username}`)}
          user={{
            profilePhoto: user.profilePhoto ?? '',
            displayName: user.displayName,
            username: user.username,
          }}
        />
      </div>
      <div className='flex flex-col ml-2 w-full justify-between'>
        <div className='flex'>
          <ContentInput
            placeholder={t('placeholder')}
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

        <div className='relative w-full'>
          <UrlContentPreview content={content} />
        </div>

        <div className='flex justify-end items-center mt-3'>
          <div className='flex space-x-2'>
            <ImageUploader
              fileInputRef={fileInputRef}
              onImageUpload={setImageData}
              disabled={commentMutation.isPending}
            />
            <Button
              className='flex items-center p-2 w-8 h-8 text-sm font-bold rounded-full '
              variant='default'
              disabled={commentMutation.isPending}
            >
              gif
            </Button>

            <Button
              className='flex bg-bluePrimary items-center h-8 px-4 text-sm text-white font-bold py-2 rounded-full'
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
