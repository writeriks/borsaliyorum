import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge özel yazı ölçeğimizi (`text-post`, `text-md`) renk sanmasın; yoksa
 * `text-fg text-post` birleştirmesinde biri düşer.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['xs', 'sm', 'post', 'md', 'lg', 'xl', '2xl'] }],
    },
  },
});

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
