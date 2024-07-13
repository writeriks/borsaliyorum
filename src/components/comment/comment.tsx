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
  Trash,
  TrendingDown,
  TrendingUp,
  UserRoundX,
  VolumeX,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import UserAvatar from '@/components/user-avatar/user-avatar';
import { Comment as CommentType } from '@/services/firebase-service/types/db-types/comments';
import { useEffect, useState } from 'react';
import userService from '@/services/user-service/user-service';
import { User } from '@/services/firebase-service/types/db-types/user';

export interface CommentProp {
  comment: CommentType;
}

const Comment = ({ comment }: CommentProp): React.ReactNode => {
  const [user, setUser] = useState<User | undefined>();
  const selfUser = useSelector(userReducerSelector.getUser);

  useEffect(() => {
    // TODO: Fetch user by user id
    const fetchUser = async (): Promise<void> => {
      const fetchedUser = await userService.getUserById(comment.userId);
      if (fetchedUser) {
        setUser(fetchedUser);
      } else {
        // TODO: Delete this. Just for testing purposes
        // setUser({
        //   userId: '',
        //   username: '',
        //   displayName: '',
        //   email: '',
        //   profilePhoto: '',
        // } as User);

        setUser(selfUser as User);
      }
    };

    fetchUser();
  }, [comment.userId, selfUser]);

  return (
    <Card
      // onClick={() => router.push(`comment/${comment.postId}`)}
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
            {/* TODO: implement dropdown click functionalities */}
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
        <p>{comment.content}</p>
        {comment.isPositiveSentiment ? (
          <div className='flex items-center p-1 rounded-md bg-bullish text-bullish-foreground'>
            <TrendingUp />
          </div>
        ) : (
          <div className='flex items-center p-1 rounded-md bg-destructive text-destructive-foreground'>
            <TrendingDown />
          </div>
        )}
      </CardContent>
      <CardFooter className='flex items-center justify-between ml-24 mr-24'>
        {/* TODO: send like request when user clicks comment's comment icon */}
        <div className='inline-flex'>
          <Heart className='h-5 w-5 hover:cursor-pointer hover:text-red-500 hover:rounded-full' />
          <span className='ml-1 text-xs flex items-center'>{comment.likeCount}</span>
        </div>
        {/* TODO: open newpost in modal when user clicks comment's comment icon */}
        <div className='inline-flex'>
          <MessageCircle className='h-5 w-5 hover:cursor-pointer hover:text-blue-500 hover:rounded-full' />
        </div>
      </CardFooter>
    </Card>
  );
};

export default Comment;
