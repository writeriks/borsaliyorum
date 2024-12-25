import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeedTab, LoadingSkeletons } from '@/app/constants';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import Post from '@/components/post/post';
import { Post as PostType } from '@prisma/client';
import { useTranslations } from 'next-intl';

interface FeedTabsProps {
  activeTab: FeedTab;
  postsByDate: PostType[];
  postsByLike: PostType[];
  isLoading: boolean;
  onTabChange: (tab: FeedTab) => void;
  onPostClick: (post: PostType) => void;
  onPostDelete: (postId: number) => void;
}

const FeedTabs: React.FC<FeedTabsProps> = ({
  activeTab,
  postsByDate,
  postsByLike,
  isLoading,
  onTabChange,
  onPostClick,
  onPostDelete,
}) => {
  const t = useTranslations('Feed');

  return (
    <Tabs
      value={activeTab} // Pass activeTab to control the active tab
      onValueChange={value => onTabChange(value as FeedTab)} // Handle tab change
      className='mt-2 w-full'
    >
      <TabsList className='w-full'>
        <TabsTrigger className='mr-10' value={FeedTab.LATEST}>
          {t('latestPosts')}
        </TabsTrigger>
        <TabsTrigger value={FeedTab.POPULAR}>{t('popularPosts')}</TabsTrigger>
      </TabsList>
      <TabsContent value={FeedTab.LATEST}>
        {postsByDate.map(post => (
          <Post
            onDeleteClick={onPostDelete}
            onPostClick={onPostClick}
            key={post.postId}
            post={post}
          />
        ))}
        {isLoading && <LoadingSkeleton type={LoadingSkeletons.POST} />}
      </TabsContent>
      <TabsContent value={FeedTab.POPULAR}>
        {postsByLike.map(post => (
          <Post
            onDeleteClick={onPostDelete}
            onPostClick={onPostClick}
            key={post.postId}
            post={post}
          />
        ))}
        {isLoading && <LoadingSkeleton type={LoadingSkeletons.POST} />}
      </TabsContent>
    </Tabs>
  );
};

export default FeedTabs;
