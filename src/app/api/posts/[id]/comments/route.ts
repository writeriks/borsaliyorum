import { handleCommentsRequest } from '@/features/comments/server/route-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public (anonim de okur); görüntüleyen oturumdan, yetki/görünürlük DAL'da (getCommentsPage).
export const GET = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> => handleCommentsRequest(request, (await params).id);
