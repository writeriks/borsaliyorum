'use client';

import type { ReactElement } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { initialsOf } from '@/lib/users/initials';

export const AuthorAvatar = ({
  displayName,
  src,
}: {
  displayName: string;
  src: string | null;
}): ReactElement => (
  <Avatar className='size-9 sm:size-10'>
    {/* `src` toSafeMediaSrc'den geçmiş olmalı (Firebase Storage allowlist); Referer gönderilmez */}
    {src ? <AvatarImage src={src} alt='' referrerPolicy='no-referrer' /> : null}
    <AvatarFallback>{initialsOf(displayName)}</AvatarFallback>
  </Avatar>
);
