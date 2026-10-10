'use client';

import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import type { ComponentProps, ReactElement } from 'react';

import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export const DialogOverlay = ({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>): ReactElement => (
  <DialogPrimitive.Overlay
    data-slot='dialog-overlay'
    className={cn(
      'fixed inset-0 z-50 bg-overlay/50',
      'data-[state=open]:animate-in data-[state=open]:fade-in-0',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
      className
    )}
    {...props}
  />
);

type DialogContentProps = ComponentProps<typeof DialogPrimitive.Content> & {
  /** Kapat butonunun erişilebilir adı (i18n'den). Verilmezse kapat butonu render edilmez. */
  closeLabel?: string;
};

export const DialogContent = ({
  className,
  children,
  closeLabel,
  ...props
}: DialogContentProps): ReactElement => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      data-slot='dialog-content'
      className={cn(
        'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 sm:max-w-lg',
        'rounded-lg border border-border bg-bg-elevated p-6 text-fg shadow-lg',
        'duration-(--duration-base) data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
        className
      )}
      {...props}
    >
      {children}
      {closeLabel ? (
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className='absolute top-2 right-2 inline-flex size-hit items-center justify-center rounded-md text-fg-muted hover:bg-bg-muted hover:text-fg'
        >
          <X aria-hidden='true' className='size-5' />
        </DialogPrimitive.Close>
      ) : null}
    </DialogPrimitive.Content>
  </DialogPortal>
);

export const DialogHeader = ({ className, ...props }: ComponentProps<'div'>): ReactElement => (
  <div
    data-slot='dialog-header'
    className={cn('flex flex-col gap-2 pr-10', className)}
    {...props}
  />
);

export const DialogFooter = ({ className, ...props }: ComponentProps<'div'>): ReactElement => (
  <div
    data-slot='dialog-footer'
    className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
    {...props}
  />
);

export const DialogTitle = ({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>): ReactElement => (
  <DialogPrimitive.Title
    data-slot='dialog-title'
    className={cn('text-md font-semibold', className)}
    {...props}
  />
);

export const DialogDescription = ({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>): ReactElement => (
  <DialogPrimitive.Description
    data-slot='dialog-description'
    className={cn('text-sm text-fg-muted', className)}
    {...props}
  />
);
