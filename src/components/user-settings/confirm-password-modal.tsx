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
import { Input } from '@/components/ui/input';

interface ConfirmPasswordModalProps {
  isOpen: boolean;
  currentPassword: string;
  onOpenChange(open: boolean): void;
  onCurrentPasswordChange(password: string): void;
  onConfirmPassword(): void;
}

export const ConfirmPasswordModal = ({
  isOpen,
  currentPassword,
  onOpenChange,
  onCurrentPasswordChange,
  onConfirmPassword,
}: ConfirmPasswordModalProps): React.ReactNode => {
  const t = useTranslations();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className='text-destructive'>
            {t('Settings.confirmPasswordModalTitle')}
          </DialogTitle>
          <DialogDescription className='mb-2'>
            {t('Settings.confirmPasswordModalBody')}

            <Input
              className='mt-4'
              type='password'
              onChange={e => onCurrentPasswordChange(e.target.value)}
              placeholder={t('Settings.currentPassword')}
            />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='sm:justify-end'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {t('Settings.cancel')}
          </Button>
          <Button
            disabled={currentPassword.length < 8}
            className='mb-2'
            variant='bullish'
            onClick={onConfirmPassword}
          >
            {t('Settings.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
