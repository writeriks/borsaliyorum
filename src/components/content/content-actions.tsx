import { Heart, MessageCircle, Repeat } from 'lucide-react';

export interface CommentProp {
  likeCount: number;
  isComment?: boolean;
  commentCount?: number;
  repostCount?: number;
}

const ContentAction: React.FC<CommentProp> = ({
  isComment = false,
  likeCount,
  commentCount,
  repostCount,
}) => {
  return (
    <>
      {/* TODO: send like request when user clicks comment's comment icon */}
      <div className='inline-flex'>
        <Heart className='h-5 w-5 hover:cursor-pointer hover:text-red-500' />
        <span className='ml-1 text-xs flex items-center'>{likeCount}</span>
      </div>
      {/* TODO: add username in the post editor when user clicks comment's comment icon */}
      <div className='inline-flex'>
        <MessageCircle className='h-5 w-5 hover:cursor-pointer hover:text-blue-500' />
        {!isComment && <span className='ml-1 text-xs flex items-center'>{commentCount}</span>}
      </div>
      {!isComment && (
        <div className='inline-flex'>
          <Repeat className='h-5 w-5 hover:cursor-pointer hover:text-green-500' />
          <span className='ml-1 text-xs flex items-center'>{repostCount}</span>
        </div>
      )}
    </>
  );
};

export default ContentAction;
