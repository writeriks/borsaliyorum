import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import UserAvatar from '@/components/user-avatar/user-avatar';
import { Comment as CommentType } from '@/services/firebase-service/types/db-types/comments';
import useFetchContentOwner from '@/hooks/useFetchContentOwner';
import ContentOptions from '@/components/content-actions/content-options';
import ContentAction from '@/components/content-actions/content-actions';
import Content from '@/components/content/content';
import Image from 'next/image';

export interface CommentProp {
  comment: CommentType;
  onCommentClick: (comment: CommentType) => void;
}

const Comment: React.FC<CommentProp> = ({ comment, onCommentClick }) => {
  const currentUser = useSelector(userReducerSelector.getUser);
  const proxyUrl = `/api/image-proxy?imageUrl=${encodeURIComponent(comment?.media?.src as string)}`;

  const commentor = useFetchContentOwner(comment.userId);

  return (
    <Card className='w-full hover:bg-accent cursor-pointer mt-1'>
      <CardContent className='p-4 flex flex-col items-start gap-4'>
        <div className='flex items-start gap-4 w-full'>
          {commentor && <UserAvatar user={commentor} />}
          <div className='space-y-1 flex-1'>
            <div className='text-sm font-bold'>{commentor?.displayName}</div>
            <div className='text-xs text-muted-foreground'>{commentor?.username}</div>
          </div>
          <ContentOptions isCommentOwner={commentor?.username === currentUser.username} />
        </div>
        <section className='p-2'>
          <Content content={comment.content} />
        </section>
        {comment.isPositiveSentiment ? (
          <div className='flex items-center p-1 rounded-md bg-bullish text-bullish-foreground'>
            <TrendingUp />
          </div>
        ) : (
          <div className='flex items-center p-1 rounded-md bg-destructive text-destructive-foreground'>
            <TrendingDown />
          </div>
        )}
        {comment?.media.src && (
          <Image
            src={!comment?.media?.src.includes('data') ? proxyUrl : comment.media.src}
            alt={comment.media.alt}
            layout='responsive'
            width={400}
            height={400}
            className='rounded-md object-contain max-h-[400px] max-w-[400px]'
          />
        )}
      </CardContent>
      <CardFooter className='flex items-center justify-between ml-24 mr-24'>
        <ContentAction
          onCommentClick={onCommentClick}
          content={comment}
          isComment={true}
          likeCount={comment.likeCount}
        />
      </CardFooter>
    </Card>
  );
};

export default Comment;
