import { Card, CardContent } from '@/components/ui/card';
import EntryFooter from '@/components/entry-footer/entry-footer';
import { useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import UserAvatar from '@/components/user-avatar/user-avatar';

import EntryOptions from '@/components/entry-actions/entry-options';
import Content from '@/components/content/content';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { Comment as CommentType, User } from '@prisma/client';
import { useRouter } from '@/i18n/routing';
import UrlContentPreview from '@/components/content-preview/content-preview';
import EntryOwner from '@/components/entry-owner/entry-owner';

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

  const router = useRouter();

  return (
    <Card className='w-full hover:bg-accent cursor-pointer mt-1'>
      <CardContent className='p-4 flex flex-col items-start gap-4'>
        <div className='flex items-start gap-4 w-full'>
          {commentor && (
            <UserAvatar
              onUserAvatarClick={() => router.push(`/users/${commentor.username}`)}
              user={commentor}
            />
          )}

          {commentor && <EntryOwner entryOwner={commentor} />}

          <EntryOptions
            isFollowed={commentor?.isUserFollowed ?? false}
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

        <UrlContentPreview content={comment.content} />
      </CardContent>
      <EntryFooter onCommentClick={onCommentClick} commentor={commentor} entry={comment as any} />
    </Card>
  );
};

export default Comment;
