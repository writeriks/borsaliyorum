/**
 * v0 by Vercel.
 * @see https://v0.dev/t/7giaJVLWRY8
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  User,
  UserRoundX,
  VolumeX,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import userReducerSelector from '@/store/reducers/user-reducer/user-reducer-selector';
import UserAvatar from '@/components/user-avatar/user-avatar';

export default function Post() {
  const placeHolderPost = {
    postId: '1',
    userId: '1',
    username: 'sikici_borsaci_31', // todo
    displayName: 'Fenasi Kerim', // todo
    isBullish: true, // todo
    repostCount: 31, // todo
    likeCount: 101,
    commentCount: 69,
    stockTickers: ['TUPRS'],
    media: {
      src: 'https://iasbh.tmgrup.com.tr/94e47f/1200/675/0/0/750/422?u=https://isbh.tmgrup.com.tr/sb/album/2024/04/03/tupras-temettu-odeme-tarihleri-2024-tuprs-tupras-temettu-odemeleri-ne-zaman-ne-kadar-yatacak-1712144230028.jpeg',
    },
    content:
      '$TUPRS - https://x.com/umutcilbas/status/1809977328685941231?s=46 Mayıs ayında tuprası satan fonlar tekrar 20 hazirandan itibaren toplamaya başlamış,uzun vade ve temettü için devam,enerjlerde şimdilik daha iyisi yok',
    createdAt: new Date('2022-05-10T12:34:56Z'),
    updatedAt: new Date('2022-05-10T12:34:56Z'),
  };

  const user = useSelector(userReducerSelector.getUser);
  const proxyUrl = `/api/imageProxy?imageUrl=${encodeURIComponent(placeHolderPost.media.src as string)}`;

  return (
    <Card className='w-full max-w-md hover:bg-secondary cursor-pointer'>
      <CardContent className='p-4 flex flex-col items-start gap-4'>
        <div className='flex items-start gap-4 w-full'>
          <UserAvatar user={user} />
          <div className='space-y-1 flex-1'>
            <div className='text-sm font-bold'>{placeHolderPost.displayName}</div>
            <div className='text-xs text-muted-foreground'>{placeHolderPost.username}</div>
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
              <DropdownMenuItem>
                <Trash className='h-4 w-4 mr-2' />
                Sil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p>{placeHolderPost.content}</p>
        {placeHolderPost.isBullish ? (
          <div className='flex items-center p-1 rounded-md bg-bullish text-bullish-foreground'>
            <TrendingUp />
          </div>
        ) : (
          <div className='flex items-center rounded-md bg-destructive text-destructive-foreground'>
            <TrendingDown />
          </div>
        )}
        <img
          src={proxyUrl}
          alt='Sample image'
          width={400}
          height={300}
          className='w-full rounded-md object-cover'
        />
      </CardContent>
      <CardFooter className='flex items-center justify-between p-2'>
        <div className='inline-flex'>
          <Heart className='h-5 w-5 hover:cursor-pointer hover:text-red-500 hover:rounded-full' />
          <span className='ml-1 text-xs flex items-center'>{placeHolderPost.likeCount}</span>
        </div>
        <div className='inline-flex'>
          <MessageCircle className='h-5 w-5 hover:cursor-pointer hover:text-blue-500 hover:rounded-full' />
          <span className='ml-1 text-xs flex items-center'>{placeHolderPost.commentCount}</span>
        </div>
        <div className='inline-flex'>
          <Repeat className='h-5 w-5 hover:cursor-pointer hover:text-green-500 hover:rounded-full' />
          <span className='ml-1 text-xs flex items-center'>{placeHolderPost.repostCount}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
