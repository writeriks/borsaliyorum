import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Ellipsis, Trash, UserRoundX, VolumeX } from 'lucide-react';

export interface CommentProp {
  isCommentOwner: boolean;
}

const ContentOptions: React.FC<CommentProp> = ({ isCommentOwner }) => {
  return (
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
        {isCommentOwner && (
          <DropdownMenuItem>
            <Trash className='h-4 w-4 mr-2' />
            Sil
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ContentOptions;
