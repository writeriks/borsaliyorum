import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Ban, Ellipsis, Trash, UserMinus, UserPlus } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { useDispatch } from 'react-redux';
import commentApiService from '@/services/api-service/comment-api-service/comment-api-service';
import { Post, Comment } from '@prisma/client';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { useEffect, useState } from 'react';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import { useTranslations } from 'next-intl';

interface EntryProp {
  isEntryOwner: boolean;
  isFollowed: boolean;
  entry: Comment | Post;
  onDeleteSuccess: (entryId: number) => void;
}

const EntryOptions: React.FC<EntryProp> = ({
  isEntryOwner,
  isFollowed,
  entry,
  onDeleteSuccess,
}) => {
  const dispatch = useDispatch();
  const t = useTranslations();
  const [isUserFollowed, setIsUserFollowed] = useState(isFollowed);
  const isComment = entry.hasOwnProperty('commentId');

  const handleError = (error: Error): void => {
    dispatch(
      setUINotification({
        message: error.message ?? t('Common.errorMessage'),
        notificationType: UINotificationEnum.ERROR,
      })
    );
  };

  useEffect(() => {
    setIsUserFollowed(isFollowed);
  }, [isFollowed]);

  const deleteCommentMutation = useMutation({
    mutationFn: async () => {
      return commentApiService.deleteComment((entry as Comment).commentId!, entry.userId);
    },
    onSuccess: (data: { deletedCommentId: number }) => {
      onDeleteSuccess(data.deletedCommentId);
      dispatch(
        setUINotification({
          message: t('EntryOptions.deleteCommentSuccess'),
          notificationType: UINotificationEnum.SUCCESS,
        })
      );
    },
    onError: handleError,
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      return postApiService.deletePost((entry as Post).postId!, entry.userId);
    },
    onSuccess: (data: { deletedPostId: number }) => {
      onDeleteSuccess(data.deletedPostId);
      dispatch(
        setUINotification({
          message: t('EntryOptions.deletePostSuccess'),
          notificationType: UINotificationEnum.SUCCESS,
        })
      );
    },
    onError: handleError,
  });

  const followUserMutation = useMutation({
    mutationFn: async () => {
      return userApiService.followUser(entry.userId);
    },
    onSuccess: () => {
      setIsUserFollowed(true);
    },
    onError: handleError,
  });

  const unfollowUserMutation = useMutation({
    mutationFn: async () => {
      return userApiService.unfollowUser(entry.userId);
    },
    onSuccess: () => {
      setIsUserFollowed(false);
    },
    onError: handleError,
  });

  const blockUserMutation = useMutation({
    mutationFn: async () => {
      return userApiService.blockUser(entry.userId);
    },
    onSuccess: () => {
      setIsUserFollowed(true);
    },
    onError: handleError,
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='rounded-full'>
          <Ellipsis className='h-5 w-5' />
          <span className='sr-only'>{t('EntryOptions.options')}</span>
        </Button>
      </DropdownMenuTrigger>
      {/* TODO: implement dropdown click functionalities */}
      <DropdownMenuContent align='end'>
        {!isEntryOwner && isUserFollowed ? (
          <DropdownMenuItem onClick={() => unfollowUserMutation.mutate()}>
            <UserMinus className='h-4 w-4 mr-2' />
            {t('EntryOptions.unfollow')}
          </DropdownMenuItem>
        ) : (
          !isEntryOwner && (
            <DropdownMenuItem onClick={() => followUserMutation.mutate()}>
              <UserPlus className='h-4 w-4 mr-2' />
              {t('EntryOptions.follow')}
            </DropdownMenuItem>
          )
        )}

        {!isEntryOwner && (
          <DropdownMenuItem onClick={() => blockUserMutation.mutate()}>
            <Ban className='h-4 w-4 mr-2' />
            {t('EntryOptions.block')}
          </DropdownMenuItem>
        )}

        {isEntryOwner && (
          <DropdownMenuItem
            onClick={() =>
              isComment ? deleteCommentMutation.mutate() : deletePostMutation.mutate()
            }
          >
            <Trash className='h-4 w-4 mr-2 text-destructive' />
            <span className='text-destructive'>{t('EntryOptions.delete')}</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EntryOptions;
