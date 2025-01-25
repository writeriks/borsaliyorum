'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onOpenChange(open: boolean): void;
  onConfirmDelete(): void;
}

export const DeleteAccountModal = ({
  isOpen,
  onOpenChange,
  onConfirmDelete,
}: DeleteAccountModalProps): React.ReactNode => {
  const t = useTranslations();

  const handleDelete = (): void => {
    onConfirmDelete();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className='text-destructive'>{t('Settings.deleteAccount')}</DialogTitle>
          <DialogDescription>{t('Settings.deleteAccountConfirmation')}</DialogDescription>
        </DialogHeader>
        <DialogFooter className='sm:justify-end'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('Settings.cancel')}
          </Button>
          <Button className='mb-2' variant='destructive' onClick={handleDelete}>
            {t('Settings.deleteAccount')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
