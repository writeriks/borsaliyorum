import { handleNewPostsRequest } from '@/features/posts/server/feed-route';
import { requireActionUser } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// "N yeni gönderi" yoklaması; yetki ve kapsam `/api/feed` ile aynı.
export const GET = (request: Request): Promise<Response> =>
  handleNewPostsRequest(request, { authorize: requireActionUser });
