import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';

import rule from './feature-boundaries.mjs';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { parser: tseslint.parser } });

const FEED = '/repo/src/features/feed/components/feed-list.ts';

tester.run('feature-boundaries', rule, {
  valid: [
    { filename: FEED, code: "import { x } from '@/features/feed/server/queries';" },
    { filename: FEED, code: "import { x } from '../server/queries';" },
    { filename: FEED, code: "import { PostCard } from '@/features/posts/components/post-card';" },
    { filename: FEED, code: "import type { Post } from '@/features/posts/types';" },
    { filename: FEED, code: "import { logger } from '@/lib/logger';" },
    { filename: FEED, code: "import { z } from 'zod';" },
    // feature dışı dosyalar (sayfalar) feature DAL'ını okuyabilir
    {
      filename: '/repo/src/app/[locale]/akis/page.tsx',
      code: "import { getHomeFeedPage } from '@/features/feed/server/queries';",
    },
    // "server" adı yalnızca katman klasörü olarak anlamlı
    { filename: FEED, code: "import { x } from '@/features/posts/server-status';" },
  ],
  invalid: [
    {
      filename: FEED,
      code: "import { getPostById } from '@/features/posts/server/queries';",
      errors: [{ messageId: 'crossFeatureServer', data: { importer: 'feed', target: 'posts' } }],
    },
    {
      filename: FEED,
      code: "import { createPost } from '../../posts/server/actions';",
      errors: [{ messageId: 'crossFeatureServer' }],
    },
    {
      filename: FEED,
      code: "export { createPost } from '@/features/posts/server';",
      errors: [{ messageId: 'crossFeatureServer' }],
    },
    {
      filename: FEED,
      code: "export * from '@/features/posts/server/actions';",
      errors: [{ messageId: 'crossFeatureServer' }],
    },
    {
      filename: FEED,
      code: "const m = import('@/features/posts/server/actions');",
      errors: [{ messageId: 'crossFeatureServer' }],
    },
  ],
});
