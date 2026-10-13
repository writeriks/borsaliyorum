'use client';

import { Ellipsis, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { dispatchPostDeleted } from '@/lib/post-events';

import { deletePost } from '../server/actions';

type PostOwnerMenuProps = {
  postId: number;
  /** Test/önizleme için action yerine geçer. */
  action?: (input: { postId: number }) => Promise<Result<null>>;
};

/**
 * Gönderi sahibinin menüsü (S10: yalnızca silme). Silme geri alınamaz → onay diyaloğu; buton
 * işlem sürerken spinner + devre dışı. Başarıda toast + sayfa verisi yenilenir (kart kaybolur).
 * Yetki sunucuda: bu menü yalnızca UI kolaylığıdır.
 */
export const PostOwnerMenu = ({
  postId,
  action = deletePost,
}: PostOwnerMenuProps): ReactElement => {
  const t = useTranslations('post.actions');
  const router = useRouter();
  const handleResult = useActionResult();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onConfirm = async (): Promise<void> => {
    setDeleting(true);
    let result: Result<null>;
    try {
      result = await action({ postId });
    } catch (error) {
      logger.warn('delete action failed', { err: error });
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
    // İstemci listeleri (akış önbelleği) kartı hemen çıkarır; sunucu verisi ayrıca tazelenir
    dispatchPostDeleted(postId);
    router.refresh();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t('menu')}
          data-testid='post-menu'
          className='-my-2 -mr-2 inline-flex size-hit shrink-0 items-center justify-center rounded-md text-fg-subtle hover:bg-bg-muted hover:text-fg'
        >
          <Ellipsis aria-hidden='true' className='size-5' />
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem
            variant='danger'
            data-testid='post-delete'
            onSelect={() => setConfirmOpen(true)}
          >
            <Trash2 aria-hidden='true' />
            {t('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirmOpen} onOpenChange={open => (deleting ? null : setConfirmOpen(open))}>
        <DialogContent data-testid='post-delete-dialog'>
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
              data-testid='post-delete-confirm'
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
