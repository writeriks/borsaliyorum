'use client';

import type { ReactElement } from 'react';

import { Avatar, AvatarFallback, AvatarImage, initialsOf } from '@/components/ui/avatar';

// İstemci bileşeni: `initialsOf` avatar primitive'iyle aynı ('use client') modülde; Server
// Component'ten doğrudan çağrılamaz.
export const AuthorAvatar = ({
  displayName,
  src,
}: {
  displayName: string;
  src: string | null;
}): ReactElement => (
  <Avatar className='size-9 sm:size-10'>
    {src ? <AvatarImage src={src} alt='' /> : null}
    <AvatarFallback>{initialsOf(displayName)}</AvatarFallback>
  </Avatar>
);
