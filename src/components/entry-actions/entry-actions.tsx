import commentApiService from '@/services/api-service/comment-api-service/comment-api-service';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { Post, Comment, User } from '@prisma/client';
import { useMutation } from '@tanstack/react-query';
import { Heart, MessageCircle, Repeat } from 'lucide-react';
import { useState } from 'react';
import { useDispatch } from 'react-redux';

type ExtendedPost = Post & {
  likedByCurrentUser: boolean;
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
  const dispatch = useDispatch();
  const isComment = 'commentId' in entry;

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
      setIsLiked(!data.isUnlike);
    },
    onError: (error: Error): void => {
      dispatch(
        setUINotification({
          message: error.message ?? 'Bir hata oluştu.',
          notificationType: UINotificationEnum.ERROR,
        })
      );
    },
  });

  // TODO: Implement fetching like count, comment count, repost count
  return (
    <>
      <div className='inline-flex'>
        <Heart
          fill={isLiked ? '#EF4444' : 'transparent'}
          color={isLiked ? '#EF4444' : '#F1F2F4'}
          cursor='pointer'
          onClick={() => likeMutation.mutate()}
          className='h-5 w-5 hover:text-red-500'
        />
        <span className='ml-1 text-xs flex items-center'>{entry.likeCount}</span>
      </div>
      <div onClick={handleCommentClick} className='inline-flex'>
        <MessageCircle className='h-5 w-5 hover:cursor-pointer hover:text-blue-500' />
        {!isComment && <span className='ml-1 text-xs flex items-center'>{entry.commentCount}</span>}
      </div>
      {!isComment && (
        <div className='inline-flex'>
          <Repeat className='h-5 w-5 hover:cursor-pointer hover:text-green-500' />
          <span className='ml-1 text-xs flex items-center'>{entry.repostCount}</span>
        </div>
      )}
    </>
  );
};

export default EntryActions;
