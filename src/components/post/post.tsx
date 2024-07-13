/**
 * v0 by Vercel.
 * @see https://v0.dev/t/7giaJVLWRY8
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Ellipsis,
  Heart,
  MessageCircle,
  Repeat,
  Trash,
  TrendingDown,
  TrendingUp,
  UserRoundX,
  VolumeX,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import UserAvatar from '@/components/user-avatar/user-avatar';
import Image from 'next/image';
import { Post as PostType } from '@/services/firebase-service/types/db-types/post';
import { useEffect, useState } from 'react';
import userService from '@/services/user-service/user-service';
import { User } from '@/services/firebase-service/types/db-types/user';
import { useRouter } from 'next/navigation';

export interface PostProp {
  post: PostType;
}

const Post = ({ post }: PostProp): React.ReactNode => {
  const [user, setUser] = useState<User | undefined>();
  const selfUser = useSelector(userReducerSelector.getUser);
  const router = useRouter();

  useEffect(() => {
    // TODO: Fetch user by user id
    const fetchUser = async (): Promise<void> => {
      const fetchedUser = await userService.getUserById(post.userId);
      if (fetchedUser) {
        setUser(fetchedUser);
      } else {
        // TODO: Delete this. Just for testing purposes
        setUser({
          userId: '',
          username: '',
          displayName: '',
          email: '',
          profilePhoto: '',
        } as User);
      }
    };

    fetchUser();
  }, [post.userId, selfUser]);

  const proxyUrl = `/api/imageProxy?imageUrl=${encodeURIComponent(post?.media?.src as string)}`;

  return (
    <Card
      onClick={() => router.push(`post/${post.postId}`)}
      className='w-full max-w-2xl hover:bg-secondary cursor-pointer'
    >
      <CardContent className='p-4 flex flex-col items-start gap-4'>
        <div className='flex items-start gap-4 w-full'>
          {user && <UserAvatar user={user} />}
          <div className='space-y-1 flex-1'>
            <div className='text-sm font-bold'>{user?.displayName}</div>
            <div className='text-xs text-muted-foreground'>{user?.username}</div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='rounded-full'>
                <Ellipsis className='h-5 w-5' />
                <span className='sr-only'>Seçenekler</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem>
                <VolumeX className='h-4 w-4 mr-2' />
                Sessize Al
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserRoundX className='h-4 w-4 mr-2' />
                Engelle
              </DropdownMenuItem>
              {/* TODO: IMPORTANT: Apply server side check */}
              {user?.username === selfUser.username && (
                <DropdownMenuItem>
                  <Trash className='h-4 w-4 mr-2' />
                  Sil
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p>{post.content}</p>
        {post.isPositiveSentiment ? (
          <div className='flex items-center p-1 rounded-md bg-bullish text-bullish-foreground'>
            <TrendingUp />
          </div>
        ) : (
          <div className='flex items-center p-1  rounded-md bg-destructive text-destructive-foreground'>
            <TrendingDown />
          </div>
        )}

        <Image
          src={proxyUrl}
          alt='Sample image'
          width={400}
          height={300}
          className='w-full rounded-md object-cover'
        />
      </CardContent>
      <CardFooter className='flex items-center justify-between ml-16 mr-16'>
        <div className='inline-flex'>
          <Heart className='h-5 w-5 hover:cursor-pointer hover:text-red-500' />
          <span className='ml-1 text-xs flex items-center'>{post.likeCount}</span>
        </div>
        <div className='inline-flex'>
          <MessageCircle className='h-5 w-5 hover:cursor-pointer hover:text-blue-500' />
          <span className='ml-1 text-xs flex items-center'>{post.commentCount}</span>
        </div>
        <div className='inline-flex'>
          <Repeat className='h-5 w-5 hover:cursor-pointer hover:text-green-500' />
          <span className='ml-1 text-xs flex items-center'>{post.repostCount}</span>
        </div>
      </CardFooter>
    </Card>
  );
};

export default Post;
