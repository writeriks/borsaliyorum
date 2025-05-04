import { Card, CardContent } from '@/components/ui/card';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import EntryOwner from '@/components/entry-owner/entry-owner';
import UserAvatar from '@/components/user-avatar/user-avatar';
import EntryOptions from '@/components/entry-actions/entry-options';
import EntryFooter from '@/components/entry-footer/entry-footer';
import Image from 'next/image';
import Content from '@/components/content/content';
import UrlContentPreview from '@/components/content-preview/content-preview';

import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from '@/i18n/routing';

import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import userApiService from '@/services/api-service/user-api-service/user-api-service';

import { LadingPagePost } from '@/services/api-service/post-api-service/constants';
import { Post as PostType, Sentiment, Repost } from '@prisma/client';

export interface PostProp {
  post:
    | (PostType & {
        reposts?: Repost[];
        isRepost?: boolean;
      })
    | LadingPagePost;
  onDeleteClick?: (postId: number) => void;
  onPostClick?: (post: PostType) => void;
}

const Post: React.FC<PostProp> = ({ post, onPostClick, onDeleteClick }) => {
  const currentUser = useSelector(userReducerSelector.getUser);
  const router = useRouter();

  const landingPagePostUser = (post as LadingPagePost).user;
  const { data: postOwner } = useQuery({
    queryKey: [`get-entry-owner-${post.userId}`],
    queryFn: async () => await userApiService.getEntryOwner(post.userId),
    enabled: !!post.userId,
  });

  const proxyUrl = `/api/image-proxy?imageUrl=${encodeURIComponent(post.mediaUrl ?? '')}`;

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

  const handleUserAvatarClick = (): void => {
    if (postOwner) {
      router.push(`/users/${postOwner.username}`);
    } else if (landingPagePostUser) {
      router.push(`/`);
    }
  };

  return (
    <Card className='w-full mb-2 overflow-hidden'>
      <CardContent className='p-4 flex flex-col items-start gap-4'>
        <div className='flex items-start gap-4 w-full'>
          {(postOwner || landingPagePostUser) && (
            <UserAvatar
              user={postOwner || (post as LadingPagePost).user}
              onUserAvatarClick={() => handleUserAvatarClick()}
            />
          )}

          {(postOwner || landingPagePostUser) && (
            <EntryOwner entryOwner={postOwner ?? landingPagePostUser} entryDate={post.createdAt} />
          )}

          {currentUser && (
            <EntryOptions
              isFollowed={postOwner?.isUserFollowed ?? false}
              onDeleteSuccess={onDeleteClick}
              entry={post}
              isEntryOwner={postOwner?.username === currentUser?.username}
            />
          )}
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
            priority
          />
        )}

        <UrlContentPreview content={post.content} />
      </CardContent>
      {currentUser && <EntryFooter onPostClick={onPostClick} entry={post as any} />}
    </Card>
  );
};

export default Post;
