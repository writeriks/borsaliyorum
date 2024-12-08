import commentApiService from '@/services/api-service/comment-api-service/comment-api-service';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { Post, Comment, User } from '@prisma/client';
import { useMutation } from '@tanstack/react-query';
import { Heart, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  onPostClick?: (post: Post) => void;
}

const EntryActions: React.FC<EntryProp> = ({ entry, commentor, onCommentClick, onPostClick }) => {
  const [isLiked, setIsLiked] = useState<boolean>(entry.likedByCurrentUser);
  const [likeCount, setLikeCount] = useState<number>(entry.likeCount ?? 0);

  const dispatch = useDispatch();
  const isComment = 'commentId' in entry;

  // Synchronize isLiked and likeCount with entry
  useEffect(() => {
    setIsLiked(entry.likedByCurrentUser);
    setLikeCount(entry.likeCount ?? 0);
  }, [entry.likedByCurrentUser, entry.likeCount]);

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
      onPostClick?.(entry as Post);
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
      setIsLiked(data.didLike);
      setLikeCount(data.didLike ? likeCount + 1 : likeCount - 1);
    },
    onError: handleError,
  });

  return (
    <>
      <div className='inline-flex px-4'>
        {isLiked ? (
          <Heart
            fill='#EF4444'
            color='#EF4444'
            cursor='pointer'
            onClick={() => likeMutation.mutate()}
            className='h-5 w-5'
          />
        ) : (
          <Heart
            cursor='pointer'
            onClick={() => likeMutation.mutate()}
            className='h-5 w-5 sm:hover:text-red-500'
          />
        )}

        <span className='ml-1 text-xs flex items-center'>{likeCount}</span>
      </div>
      <div onClick={handleCommentClick} className='inline-flex'>
        <MessageCircle className='h-5 w-5 hover:cursor-pointer hover:text-blue-500' />
        {!isComment && <span className='ml-1 text-xs flex items-center'>{entry.commentCount}</span>}
      </div>
    </>
  );
};

export default EntryActions;
