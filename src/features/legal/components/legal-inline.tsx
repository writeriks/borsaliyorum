import type { ReactElement } from 'react';

import { Link } from '@/i18n/navigation';
import { LEGAL_HREF } from '@/lib/legal/versions';
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/support';

import type { PlaceholderKey } from '../content';
import { parseLegalInline } from '../inline';

const linkClass = 'font-medium text-accent underline underline-offset-2 hover:text-fg';

type LegalInlineProps = {
  text: string;
  placeholders: Readonly<Record<PlaceholderKey, string>>;
};

/** Satır içi işaretli metni (bkz. `parseLegalInline`) React öğelerine çevirir; HTML enjekte etmez. */
export const LegalInline = ({ text, placeholders }: LegalInlineProps): ReactElement => (
  <>
    {parseLegalInline(text).map((token, index) => {
      switch (token.kind) {
        case 'text':
          return token.text;
        case 'bold':
          return (
            <strong key={index} className='font-semibold text-fg'>
              {token.text}
            </strong>
          );
        case 'placeholder':
          // Doldurulmamış alan görünür kalsın: yayından önce fark edilmeli (docs/legal/README.md)
          return (
            <mark
              key={index}
              data-legal-placeholder={token.key}
              className='rounded-sm bg-warn-bg px-1 text-fg'
            >
              {`[${placeholders[token.key]}]`}
            </mark>
          );
        case 'link':
          return (
            <Link key={index} href={LEGAL_HREF[token.doc]} className={linkClass}>
              {token.label}
            </Link>
          );
        case 'mail':
          return (
            <a key={index} href={SUPPORT_MAILTO} className={linkClass}>
              {SUPPORT_EMAIL}
            </a>
          );
      }
    })}
  </>
);
