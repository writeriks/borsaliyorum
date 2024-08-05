import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Ellipsis, Trash, UserRoundX } from 'lucide-react';
import { Post } from '@/services/firebase-service/types/db-types/post';
import { Comment } from '@/services/firebase-service/types/db-types/comment';
import { useMutation } from '@tanstack/react-query';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { useDispatch } from 'react-redux';
import commentApiService from '@/services/api-service/comment-api-service/comment-api-service';

interface ContentProp {
  isContentOwner: boolean;
  content: Comment | Post;
  onDeleteSuccess: (contentId: string) => void;
}

const ContentOptions: React.FC<ContentProp> = ({ isContentOwner, content, onDeleteSuccess }) => {
  const dispatch = useDispatch();

  const deleteCommentMutation = useMutation({
    mutationFn: async () => {
      return commentApiService.deleteComment((content as Comment).commentId!, content.userId);
    },
    onSuccess: (data: { deletedCommentId: string }) => {
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
        {isContentOwner && (
          <DropdownMenuItem onClick={() => deleteCommentMutation.mutate()}>
            <Trash className='h-4 w-4 mr-2 text-destructive' />
            <span className='text-destructive'>Sil</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ContentOptions;
