import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import UserAvatar from '@/components/user-avatar/user-avatar';
import Image from 'next/image';
import { Post as PostType } from '@/services/firebase-service/types/db-types/post';
import { useRouter } from 'next/navigation';
import useFetchContentOwner from '@/hooks/useFetchContentOwner';
import ContentOptions from '@/components/content/content-options';
import ContentAction from '@/components/content/content-actions';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface PostProp {
  post: PostType;
}

const Post: React.FC<PostProp> = ({ post }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentUser = useSelector(userReducerSelector.getUser);
  const router = useRouter();

  const postOwner = useFetchContentOwner(post.userId);

  const proxyUrl = `/api/image-proxy?imageUrl=${encodeURIComponent(post?.media?.src as string)}`;

  const toggleReadMore = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  /* TODO:
  - Add styling for tags
  - Add follow/unfollow button to top right of post
  - Add post creation date or subtract from today's date and put 1d ago, 2d ago etc.
  */
  return (
    <Card
      onClick={() => router.push(`post/${post.postId}`)}
      className='w-full hover:bg-secondary cursor-pointer mb-8 max-h-[640px] overflow-hidden'
    >
      <CardContent className='p-4 flex flex-col items-start gap-4'>
        <div className='flex items-start gap-4 w-full'>
          {postOwner && <UserAvatar user={postOwner} />}
          <div className='space-y-1 flex-1'>
            <div className='text-sm font-bold'>{postOwner?.displayName}</div>
            <div className='text-xs text-muted-foreground'>{postOwner?.username}</div>
          </div>
          <ContentOptions isCommentOwner={postOwner?.username === currentUser.username} />
        </div>

        <div className='break-words break-all p-2'>
          <p className={cn('overflow-hidden', isExpanded ? '' : 'line-clamp-3')}>{post.content}</p>
          {post.content.length > 100 && (
            <button
              onClick={e => toggleReadMore(e)}
              className='text-blue-500 text-xs hover:underline mt-2'
            >
              {isExpanded ? 'Küçült' : 'Devamını Oku'}
            </button>
          )}
        </div>

        {post.isPositiveSentiment ? (
          <div className='flex items-center p-1 rounded-md bg-bullish text-bullish-foreground'>
            <TrendingUp />
          </div>
        ) : (
          <div className='flex items-center p-1  rounded-md bg-destructive text-destructive-foreground'>
            <TrendingDown />
          </div>
        )}

        {post?.media.src && (
          <Image
            src={proxyUrl}
            alt={post.media.alt}
            layout='responsive'
            width={400}
            height={400}
            className='rounded-md object-contain max-h-[400px] max-w-[400px]'
          />
        )}
      </CardContent>
      <CardFooter className='flex items-center justify-between ml-16 mr-16'>
        <ContentAction
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          repostCount={post.repostCount}
        />
      </CardFooter>
    </Card>
  );
};

export default Post;
