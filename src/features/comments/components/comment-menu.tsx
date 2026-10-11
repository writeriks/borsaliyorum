'use client';

import { Ellipsis, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ReactElement, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActionResult } from '@/lib/client/action-result';
import { ErrorCode, type Result } from '@/lib/errors';
import { logger } from '@/lib/logger';

import { deleteComment } from '../server/actions';

export type DeleteCommentAction = (input: { commentId: number }) => Promise<Result<null>>;

type CommentMenuProps = {
  commentId: number;
  /** Başarılı silmeden sonra (liste ve sayaç güncellemesi çağıranda). */
  onDeleted: () => void;
  /** Test/önizleme için action yerine geçer. */
  action?: DeleteCommentAction;
};

/**
 * Yorum menüsü: yorumun sahibine ve moderatör/admin'e (K-A) silme. Silme geri alınamaz → onay
 * diyaloğu; buton işlem sürerken spinner + devre dışı. Yetki sunucuda (`deleteComment`, rol
 * DB'den); bu menü yalnızca UI kolaylığıdır.
 */
export const CommentMenu = ({
  commentId,
  onDeleted,
  action = deleteComment,
}: CommentMenuProps): ReactElement => {
  const t = useTranslations('comments.actions');
  const handleResult = useActionResult();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onConfirm = async (): Promise<void> => {
    setDeleting(true);
    let result: Result<null>;
    try {
      result = await action({ commentId });
    } catch (error) {
      logger.warn('comment delete action failed', { err: error });
      result = { ok: false, error: ErrorCode.INTERNAL };
    } finally {
      setDeleting(false);
    }
    setConfirmOpen(false);
    if (!result.ok) {
      handleResult(result);
      return;
    }
    toast(t('deleted'));
    onDeleted();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('menu')}
          data-testid='comment-menu'
          className='-my-2 -mr-2 inline-flex size-hit shrink-0 items-center justify-center rounded-md text-fg-subtle hover:bg-bg-muted hover:text-fg'
        >
          <Ellipsis aria-hidden='true' className='size-5' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem
            variant='danger'
            data-testid='comment-delete'
            onSelect={() => setConfirmOpen(true)}
          >
            <Trash2 aria-hidden='true' />
            {t('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirmOpen} onOpenChange={open => (deleting ? null : setConfirmOpen(open))}>
        <DialogContent data-testid='comment-delete-dialog'>
          <DialogHeader>
            <DialogTitle>{t('deleteTitle')}</DialogTitle>
            <DialogDescription>{t('deleteBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' disabled={deleting}>
                {t('cancel')}
              </Button>
            </DialogClose>
            <Button
              variant='danger'
              loading={deleting}
              data-testid='comment-delete-confirm'
              onClick={() => void onConfirm()}
            >
              {deleting ? t('deleting') : t('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
