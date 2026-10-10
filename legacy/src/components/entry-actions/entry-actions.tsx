import { useRouter } from '@/i18n/routing';
import commentApiService from '@/services/api-service/comment-api-service/comment-api-service';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { Post, Comment, User } from '@prisma/client';
import { useMutation } from '@tanstack/react-query';
import { Heart, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

type ExtendedPost = Post & {
  likedByCurrentUser: boolean;
  repostedByCurrentUser: boolean;
  commentCount: number;
  repostCount: number;
  likeCount: number;
};

type ExtendedComment = Comment & {
  likedByCurrentUser: boolean;
  likeCount: number;
};
interface EntryProp {
  entry: ExtendedPost | ExtendedComment;
  commentor?: User;
  onCommentClick?: (commentor: User) => void;
  _onPostClick?: (post: Post) => void;
}

const EntryActions: React.FC<EntryProp> = ({ entry, commentor, onCommentClick, _onPostClick }) => {
  const [isLiked, setIsLiked] = useState<boolean>(entry.likedByCurrentUser);
  const [likeCount, setLikeCount] = useState<number>(entry.likeCount ?? 0);

  const dispatch = useDispatch();
  const router = useRouter();
  const isComment = 'commentId' in entry;

  const handleError = (error: Error): void => {
    dispatch(
      setUINotification({
        message: error.message ?? 'Bir hata oluştu.',
        notificationType: UINotificationEnum.ERROR,
      })
    );
  };

  const handleCommentClick = (): void => {
    if (isComment && onCommentClick) {
      onCommentClick(commentor as User);
    } else {
      router.push(`/posts/${entry.postId}`);
    }
  };

  const likeMutation = useMutation({
    mutationFn: async () => {
      if (isComment) {
        return commentApiService.toggleCommentLike(entry.commentId);
      } else {
        return postApiService.togglePostLike(entry.postId);
      }
    },
    onSuccess: data => {
      // Verify the optimistic update was correct
      // If server response differs from our optimistic update, correct it
      if (data.didLike !== isLiked) {
        setIsLiked(data.didLike);
        setLikeCount(data.didLike ? likeCount + 1 : likeCount - 1);
      }
    },
    onError: error => {
      // Revert the optimistic update on error
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount + 1 : likeCount - 1);
      handleError(error);
    },
  });

  const handleLikeClick = (): void => {
    // Prevent multiple clicks while request is pending
    if (likeMutation.isPending) return;

    // Optimistic update: immediately update UI
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(newIsLiked ? likeCount + 1 : likeCount - 1);

    // Then make the API call
    likeMutation.mutate();
  };

  return (
    <>
      <div className='inline-flex px-4'>
        {isLiked ? (
          <Heart
            fill='#EF4444'
            color='#EF4444'
            cursor={likeMutation.isPending ? 'default' : 'pointer'}
            onClick={handleLikeClick}
            className={`h-5 w-5 ${likeMutation.isPending ? 'opacity-60' : ''}`}
          />
        ) : (
          <Heart
            cursor={likeMutation.isPending ? 'default' : 'pointer'}
            onClick={handleLikeClick}
            className={`h-5 w-5 sm:hover:text-red-500 ${likeMutation.isPending ? 'opacity-60' : ''}`}
          />
        )}

        <span className='ml-1 text-xs flex items-center'>{likeCount}</span>
      </div>
      <div onClick={handleCommentClick} data-nav='true' className='inline-flex'>
        <MessageCircle className='h-5 w-5 hover:cursor-pointer hover:text-blue-500' />
        {!isComment && <span className='ml-1 text-xs flex items-center'>{entry.commentCount}</span>}
      </div>
    </>
  );
};

export default EntryActions;
