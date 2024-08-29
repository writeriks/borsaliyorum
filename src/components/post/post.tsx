import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Minus, Repeat, TrendingDown, TrendingUp } from 'lucide-react';
import { useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import UserAvatar from '@/components/user-avatar/user-avatar';
import Image from 'next/image';
import EntryOptions from '@/components/entry-actions/entry-options';
import EntryActions from '@/components/entry-actions/entry-actions';
import Content from '@/components/content/content';
import { formatDate } from '@/utils/content-utils/content-utils';
import { Post as PostType, Sentiment, Repost } from '@prisma/client';
import TooltipWithEllipsis from '@/components/tooltip-with-ellipsis/tooltip-with-ellipsis';
import { useQuery } from '@tanstack/react-query';
import userApiService from '@/services/api-service/user-api-service/user-api-service';

export interface PostProp {
  post: PostType & {
    reposts?: Repost[];
  };
  onPostClick?: (post: PostType) => void;
}

const Post: React.FC<PostProp> = ({ post, onPostClick }) => {
  const currentUser = useSelector(userReducerSelector.getUser);

  const { data: postOwner } = useQuery({
    queryKey: [`get-entry-owner-${post.userId}`],
    queryFn: async () => await userApiService.getEntryOwner(post.userId),
    enabled: !!post.userId,
  });

  const { data: repostOwner } = useQuery({
    queryKey: [`get-entry-owner-${post?.reposts?.[0]?.repostedBy ?? 0}`],
    queryFn: async () => await userApiService.getEntryOwner(post?.reposts?.[0]?.repostedBy ?? 0),
    enabled: !!post?.reposts?.[0]?.repostedBy ?? false,
  });

  const proxyUrl = `/api/image-proxy?imageUrl=${encodeURIComponent(post.mediaUrl ?? '')}`;

  const postDate = formatDate(post.createdAt.toString());

  const renderSentiment = {
    [Sentiment.bullish]: (
      <div className='flex items-center p-1 rounded-md bg-bullish text-bullish-foreground'>
        <TrendingUp />
      </div>
    ),
    [Sentiment.bearish]: (
      <div className='flex items-center p-1  rounded-md bg-destructive text-destructive-foreground'>
        <TrendingDown />
      </div>
    ),
    [Sentiment.neutral]: (
      <div className='flex items-center p-1  rounded-md bg-secondary text-destructive-foreground'>
        <Minus />
      </div>
    ),
  };

  return (
    <Card className='w-full mb-2 overflow-hidden'>
      {!!post?.reposts?.length && repostOwner?.isUserFollowed && (
        <CardHeader className='p-2 text-slate-400'>
          <div className='inline-flex items-center'>
            <Repeat className='h-4 w-4 ml-2 text-green-500' />
            <span className='ml-2 text-sm flex '>
              <a className='hover:underline' href={`/users/${repostOwner?.username}`}>
                {repostOwner?.displayName} tarafından yeniden yayınlandı.
              </a>
            </span>
          </div>
        </CardHeader>
      )}

      <CardContent className='p-4 flex flex-col items-start gap-4'>
        <div className='flex items-start gap-4 w-full'>
          {postOwner && <UserAvatar user={postOwner} isClickAllowed />}
          <div className='space-y-1 flex-1'>
            <div className='text-sm font-bold'>
              <a className='hover:underline' href={`/users/${postOwner?.username}`}>
                {postOwner?.displayName}
              </a>
            </div>
            <div className='text-xs text-muted-foreground'>
              <a className='hover:underline' href={`/users/${postOwner?.username}`}>
                <span className='mr-1'>{postOwner?.username}</span>
              </a>

              <span className='font-bold'> · </span>
              <TooltipWithEllipsis tooltipText={postDate.fullDate}>
                <span className='ml-1 hover:underline'>{`${postDate.displayDate}`}</span>
              </TooltipWithEllipsis>
            </div>
          </div>
          {/* TODO Implement post delete logic */}
          <EntryOptions
            isFollowed={postOwner?.isUserFollowed ?? false}
            onDeleteSuccess={() => console.log('TODO: Implement')}
            entry={post}
            isEntryOwner={postOwner?.username === currentUser.username}
          />
        </div>

        <section className='p-2'>
          <Content content={post.content} />
        </section>

        {renderSentiment[post.sentiment]}

        {post?.mediaUrl && (
          <Image
            src={proxyUrl}
            alt='Gönderi resmi'
            layout='responsive'
            width={600}
            height={600}
            className='rounded-md object-contain max-h-[400px] max-w-[400px]'
          />
        )}
      </CardContent>
      <CardFooter className='flex items-center justify-between ml-16 mr-16'>
        <EntryActions onPostClick={onPostClick} entry={post as any} />
      </CardFooter>
    </Card>
  );
};

export default Post;
