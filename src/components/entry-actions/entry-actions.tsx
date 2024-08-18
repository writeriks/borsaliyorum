import { Post, Comment, User } from '@prisma/client';
import { Heart, MessageCircle, Repeat } from 'lucide-react';

interface EntryProp {
  entry: Post | Comment;
  commentor?: User;
  onCommentClick?: (commentor: User) => void;
  onPostClick?: (post: Post) => void;
}

const EntryActions: React.FC<EntryProp> = ({ entry, commentor, onCommentClick, onPostClick }) => {
  const isComment = 'commentId' in entry;

  const handleCommentClick = (): void => {
    if (isComment && onCommentClick) {
      onCommentClick(commentor as User);
    } else {
      onPostClick?.(entry as Post);
    }
  };

  // TODO: Implement fetching like count, comment count, repost count
  return (
    <>
      {/* TODO: send like request when user clicks comment's comment icon */}
      <div className='inline-flex'>
        <Heart className='h-5 w-5 hover:cursor-pointer hover:text-red-500' />
        <span className='ml-1 text-xs flex items-center'>{entry.likeCount}</span>
      </div>
      {/* TODO: add username in the post editor when user clicks comment's comment icon */}
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
