import { Post, Comment } from '@prisma/client';
import { Heart, MessageCircle, Repeat } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ContentProp {
  content: Post | Comment;
  onCommentClick?: (content: Post | Comment) => void;
}

const ContentAction: React.FC<ContentProp> = ({ content, onCommentClick }) => {
  const router = useRouter();

  const isComment = 'commentId' in content;

  const handleCommentClick = (): void => {
    if (isComment && onCommentClick) {
      onCommentClick(content);
    } else {
      router.push(`post/${content.postId}`);
    }
  };

  // TODO: Implement fetching like count, comment count, repost count
  return (
    <>
      {/* TODO: send like request when user clicks comment's comment icon */}
      <div className='inline-flex'>
        <Heart className='h-5 w-5 hover:cursor-pointer hover:text-red-500' />
        <span className='ml-1 text-xs flex items-center'>{content.likeCount}</span>
      </div>
      {/* TODO: add username in the post editor when user clicks comment's comment icon */}
      <div onClick={handleCommentClick} className='inline-flex'>
        <MessageCircle className='h-5 w-5 hover:cursor-pointer hover:text-blue-500' />
        {!isComment && (
          <span className='ml-1 text-xs flex items-center'>{content.commentCount}</span>
        )}
      </div>
      {!isComment && (
        <div className='inline-flex'>
          <Repeat className='h-5 w-5 hover:cursor-pointer hover:text-green-500' />
          <span className='ml-1 text-xs flex items-center'>{content.repostCount}</span>
        </div>
      )}
    </>
  );
};

export default ContentAction;
