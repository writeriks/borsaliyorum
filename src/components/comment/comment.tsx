import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import UserAvatar from '@/components/user-avatar/user-avatar';

import EntryOptions from '@/components/entry-actions/entry-options';
import EntryActions from '@/components/entry-actions/entry-actions';
import Content from '@/components/content/content';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import commentApiService from '@/services/api-service/comment-api-service/comment-api-service';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { Comment as CommentType, User } from '@prisma/client';

interface CommentProp {
  comment: CommentType;
  onCommentClick: (commentor: User) => void;
  onDeleteClick: (commentId: number) => void;
}

const Comment: React.FC<CommentProp> = ({ comment, onCommentClick, onDeleteClick }) => {
  const currentUser = useSelector(userReducerSelector.getUser);
  const proxyUrl = `/api/image-proxy?imageUrl=${encodeURIComponent(comment.mediaUrl ?? '')}`;

  const { data: commentor } = useQuery({
    queryKey: [`get-entry-owner-${comment.userId}`],
    queryFn: async () => await userApiService.getEntryOwner(comment.userId),
  });

  return (
    <Card className='w-full hover:bg-accent cursor-pointer mt-1'>
      <CardContent className='p-4 flex flex-col items-start gap-4'>
        <div className='flex items-start gap-4 w-full'>
          {commentor && <UserAvatar user={commentor} />}
          <div className='space-y-1 flex-1'>
            <div className='text-sm font-bold'>{commentor?.displayName}</div>
            <div className='text-xs text-muted-foreground'>{commentor?.username}</div>
          </div>
          <EntryOptions
            onDeleteSuccess={onDeleteClick}
            entry={comment}
            isEntryOwner={commentor?.username === currentUser.username}
          />
        </div>
        <section className='p-2'>
          <Content content={comment.content} />
        </section>
        {comment?.mediaUrl && (
          <Image
            src={proxyUrl}
            alt={comment.createdAt.toString()}
            layout='responsive'
            width={400}
            height={400}
            className='rounded-md object-contain max-h-[400px] max-w-[400px]'
          />
        )}
      </CardContent>
      <CardFooter className='flex items-center justify-between ml-24 mr-24'>
        <EntryActions onCommentClick={onCommentClick} commentor={commentor} entry={comment} />
      </CardFooter>
    </Card>
  );
};

export default Comment;
