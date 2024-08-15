import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import UserAvatar from '@/components/user-avatar/user-avatar';
import Image from 'next/image';
import useFetchContentOwner from '@/hooks/useFetchContentOwner';
import ContentOptions from '@/components/content-actions/content-options';
import ContentAction from '@/components/content-actions/content-actions';
import Content from '@/components/content/content';
import { formatDate } from '@/app/utils/content-utils/content-utils';
import { Post as PostType } from '@prisma/client';
import TooltipWithEllipsis from '@/components/tooltip-with-ellipsis/tooltip-with-ellipsis';

export interface PostProp {
  post: PostType;
}

const Post: React.FC<PostProp> = ({ post }) => {
  const currentUser = useSelector(userReducerSelector.getUser);

  const postOwner = useFetchContentOwner(post.userId);

  const proxyUrl = `/api/image-proxy?imageUrl=${encodeURIComponent(post.mediaUrl ?? '')}`;

  const postDate = formatDate(post.createdAt.toString());

  /* TODO:
  - Add styling for tags
  - Add follow/unfollow button to top right of post
  - Add post creation date or subtract from today's date and put 1d ago, 2d ago etc.
  */
  return (
    <Card className='w-full cursor-pointer mb-2 overflow-hidden'>
      <CardContent className='p-4 flex flex-col items-start gap-4'>
        <div className='flex items-start gap-4 w-full'>
          {postOwner && <UserAvatar user={postOwner} />}
          <div className='space-y-1 flex-1'>
            <div className='text-sm font-bold'>{postOwner?.displayName}</div>
            <div className='text-xs text-muted-foreground'>
              <span className='mr-1'>{postOwner?.username}</span>
              <span className='font-bold'> · </span>
              <TooltipWithEllipsis tooltipText={postDate.fullDate}>
                <span className='ml-1 hover:underline'>{`${postDate.displayDate}`}</span>
              </TooltipWithEllipsis>
            </div>
          </div>
          {/* TODO Implement post delete logic */}
          <ContentOptions
            onDeleteSuccess={() => console.log('TODO: Implement')}
            content={post}
            isContentOwner={postOwner?.username === currentUser.username}
          />
        </div>

        <section className='p-2'>
          <Content content={post.content} />
        </section>

        {post.sentiment ? (
          <div className='flex items-center p-1 rounded-md bg-bullish text-bullish-foreground'>
            <TrendingUp />
          </div>
        ) : (
          <div className='flex items-center p-1  rounded-md bg-destructive text-destructive-foreground'>
            <TrendingDown />
          </div>
        )}

        {post?.mediaUrl && (
          <Image
            src={proxyUrl}
            alt='Gönderi resmi'
            layout='responsive'
            width={400}
            height={400}
            className='rounded-md object-contain max-h-[400px] max-w-[400px]'
          />
        )}
      </CardContent>
      <CardFooter className='flex items-center justify-between ml-16 mr-16'>
        <ContentAction content={post} />
      </CardFooter>
    </Card>
  );
};

export default Post;
