import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import { Slot } from 'radix-ui';
import type { ComponentProps, ReactElement } from 'react';

import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap',
    'transition-colors duration-(--duration-fast) ease-out select-none',
    'disabled:pointer-events-none disabled:opacity-60 aria-disabled:opacity-60',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:bg-accent/90',
        secondary: 'bg-bg-muted text-fg hover:bg-bg-muted/80',
        ghost: 'text-fg hover:bg-bg-muted',
        outline: 'border border-border-strong bg-transparent text-fg hover:bg-bg-muted',
        danger: 'bg-danger text-bg hover:bg-danger/90',
      },
      // sm yalnızca masaüstü yoğun listeler için (32px); dokunma yüzeylerinde lg/icon kullan
      size: {
        sm: 'h-8 px-3 text-sm [&_svg]:size-4',
        md: 'h-10 px-4 text-sm [&_svg]:size-4',
        lg: 'min-h-hit px-5 text-sm [&_svg]:size-5',
        icon: 'size-hit [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'lg' },
  }
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Radix Slot ile alt öğeye (ör. Link) stil ve davranışı aktarır */
    asChild?: boolean;
    /** Mutasyon sürerken: buton devre dışı + buton içi spinner (design-system) */
    loading?: boolean;
  };

export const Button = ({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps): ReactElement => {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (asChild) {
    return (
      <Slot.Root data-slot='button' className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      data-slot='button'
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <LoaderCircle aria-hidden='true' className='animate-spin' data-testid='button-spinner' />
      ) : null}
      {children}
    </button>
  );
};
