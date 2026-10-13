'use client';

import type { ReactElement, ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type NavLinkProps = {
  href: string;
  label: string;
  /** Dekoratif ikon (aria-hidden); erişilebilir ad `label` */
  icon: ReactNode;
  /** `side`: md–lg ikon rayı (tooltip), xl etiketli menü; `tab`: mobil alt tab bar */
  variant: 'side' | 'tab';
  /** Sayı gibi ek içerik (bildirim sayacı vb.) */
  trailing?: ReactNode;
};

export const isActivePath = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

export const NavLink = ({ href, label, icon, variant, trailing }: NavLinkProps): ReactElement => {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  if (variant === 'tab') {
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex min-h-hit min-w-hit flex-1 flex-col items-center justify-center gap-1 rounded-md px-1 text-xs',
          'text-fg-muted transition-colors duration-(--duration-fast) hover:text-fg',
          'aria-[current=page]:font-semibold aria-[current=page]:text-fg [&_svg]:size-6'
        )}
      >
        {icon}
        <span className='max-w-full truncate'>{label}</span>
      </Link>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'flex min-h-hit min-w-hit items-center justify-center gap-4 rounded-full text-md text-fg',
            'transition-colors duration-(--duration-fast) hover:bg-bg-muted',
            'aria-[current=page]:font-semibold xl:justify-start xl:px-3 [&_svg]:size-6'
          )}
        >
          {icon}
          <span aria-hidden='true' className='hidden xl:inline'>
            {label}
          </span>
          {trailing}
        </Link>
      </TooltipTrigger>
      <TooltipContent side='right' className='xl:hidden'>
        {label}
      </TooltipContent>
    </Tooltip>
  );
};
