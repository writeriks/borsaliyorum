import type { ReactElement, ReactNode } from 'react';

type AuthPageFrameProps = {
  title: string;
  lead: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** Giriş/kayıt/onboarding sayfalarının ortak iskeleti (tek kolon, en fazla 400px). */
export const AuthPageFrame = ({
  title,
  lead,
  children,
  footer,
}: AuthPageFrameProps): ReactElement => (
  <div className='mx-auto flex w-full max-w-100 flex-col gap-6 px-4 py-8 sm:py-12'>
    <header className='flex flex-col gap-2'>
      <h1 className='text-2xl font-bold tracking-tight text-fg'>{title}</h1>
      <p className='text-sm text-fg-muted'>{lead}</p>
    </header>
    {children}
    {footer ? <div className='flex flex-col gap-3 text-sm text-fg-muted'>{footer}</div> : null}
  </div>
);

/** `?next=` arama parametresini (dizi gelebilir) tek değere indirir; süzme `safeNextPath`'te. */
export const firstParam = (value: string | string[] | undefined): string | null =>
  (Array.isArray(value) ? value[0] : value) ?? null;
