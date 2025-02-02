'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onOpenChange(open: boolean): void;
  onConfirm(): void;
  inputPlaceholder?: string;
  inputValue?: string;
  onInputChange?(value: string): void;
  confirmDisabled?: boolean;
  confirmVariant?: 'default' | 'destructive' | 'bullish' | 'outline';
  titleClass?: string;
}

export const ConfirmationModal = ({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onOpenChange,
  onConfirm,
  inputPlaceholder,
  inputValue,
  onInputChange,
  confirmDisabled = false,
  confirmVariant = 'default',
  titleClass = 'text-destructive',
}: ConfirmationModalProps): React.ReactNode => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className={titleClass}>{title}</DialogTitle>
          <DialogDescription className='mb-2'>{description}</DialogDescription>
        </DialogHeader>

        {onInputChange && inputPlaceholder && (
          <Input
            className='mt-4'
            type='password'
            onChange={e => onInputChange(e.target.value)}
            value={inputValue}
            placeholder={inputPlaceholder}
          />
        )}

        <DialogFooter className='sm:justify-end'>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            disabled={confirmDisabled}
            className='mb-2'
            variant={confirmVariant}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
