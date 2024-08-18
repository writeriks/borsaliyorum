import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Ban, Ellipsis, Trash, UserMinus, UserPlus, UserRoundX } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { useDispatch } from 'react-redux';
import commentApiService from '@/services/api-service/comment-api-service/comment-api-service';
import { Post, Comment } from '@prisma/client';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { useEffect, useState } from 'react';

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
  const [isUserFollowed, setIsUserFollowed] = useState(isFollowed);

  const handleError = (error: Error): void => {
    dispatch(
      setUINotification({
        message: error.message ?? 'Bir hata oluştu.',
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
          message: 'Yorumunuz başarıyla silindi.',
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
          <span className='sr-only'>Seçenekler</span>
        </Button>
      </DropdownMenuTrigger>
      {/* TODO: implement dropdown click functionalities */}
      <DropdownMenuContent align='end'>
        {!isEntryOwner && isUserFollowed ? (
          <DropdownMenuItem onClick={() => unfollowUserMutation.mutate()}>
            <UserMinus className='h-4 w-4 mr-2' />
            Takipten Çıkar
          </DropdownMenuItem>
        ) : (
          !isEntryOwner && (
            <DropdownMenuItem onClick={() => followUserMutation.mutate()}>
              <UserPlus className='h-4 w-4 mr-2' />
              Takip Et
            </DropdownMenuItem>
          )
        )}

        {!isEntryOwner && (
          <DropdownMenuItem onClick={() => blockUserMutation.mutate()}>
            <Ban className='h-4 w-4 mr-2' />
            Engelle
          </DropdownMenuItem>
        )}

        {isEntryOwner && (
          <DropdownMenuItem onClick={() => deleteCommentMutation.mutate()}>
            <Trash className='h-4 w-4 mr-2 text-destructive' />
            <span className='text-destructive'>Sil</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EntryOptions;
