import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Ellipsis, Trash, UserRoundX } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { useDispatch } from 'react-redux';
import commentApiService from '@/services/api-service/comment-api-service/comment-api-service';
import { Post, Comment } from '@prisma/client';

interface EntryProp {
  isEntryOwner: boolean;
  entry: Comment | Post;
  onDeleteSuccess: (entryId: number) => void;
}

const EntryOptions: React.FC<EntryProp> = ({ isEntryOwner, entry, onDeleteSuccess }) => {
  const dispatch = useDispatch();

  const deleteCommentMutation = useMutation({
    mutationFn: async () => {
      return commentApiService.deleteComment((entry as Comment).commentId!, entry.userId);
    },
    onSuccess: (data: { deletedCommentId: number }) => {
      onDeleteSuccess(data.deletedCommentId);
      dispatch(
        setUINotification({
          message: 'Yorumunuz başarıyla silindi.',
          notificationType: UINotificationEnum.SUCCESS,
        })
      );
    },
    onError: () => {
      dispatch(
        setUINotification({
          message: 'Bir hata oluştu.',
          notificationType: UINotificationEnum.ERROR,
        })
      );
    },
  });

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
          <UserRoundX className='h-4 w-4 mr-2' />
          Engelle
        </DropdownMenuItem>
        {isEntryOwner && (
          <DropdownMenuItem onClick={() => deleteCommentMutation.mutate()}>
            <Trash className='h-4 w-4 mr-2 text-destructive' />
            <span className='text-destructive'>Sil</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EntryOptions;
