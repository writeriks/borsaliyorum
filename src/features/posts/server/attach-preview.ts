import 'server-only';

import type { PrismaClient } from '@/lib/db';
import { findReadyPreviewId } from '@/lib/content/resolve';
import { getOrFetchPreview, type PreviewDeps } from '@/lib/link-preview/get-or-fetch-preview';
import type { Logger } from '@/lib/logger';

export type AttachPreviewDeps = {
  readonly db: PrismaClient;
  readonly log: Logger;
  readonly fetchOptions?: PreviewDeps['fetchOptions'];
};

/**
 * Gönderi yanıtlandıktan sonra (`after()`) önizlemeyi çeker ve gönderiye bağlar (ADR-0002
 * Karar 6 adım 3). Önizleme yoksa (engelli, başlıksız, zaman aşımı) gönderi kartsız kalır.
 * Arada başka bir bağlantı yapılmışsa ezilmez. Hata gönderiyi etkilemez; yalnızca loglanır.
 */
export const attachPreviewToPost = async (
  postId: number,
  url: string,
  deps: AttachPreviewDeps
): Promise<boolean> => {
  try {
    const preview = await getOrFetchPreview(url, {
      db: deps.db,
      logger: deps.log,
      ...(deps.fetchOptions ? { fetchOptions: deps.fetchOptions } : {}),
    });
    if (preview === null) return false;
    const previewId = await findReadyPreviewId(deps.db, url);
    if (previewId === null) return false;
    const updated = await deps.db.post.updateMany({
      where: { postId, linkPreviewId: null, deletedAt: null },
      data: { linkPreviewId: previewId },
    });
    return updated.count > 0;
  } catch (error) {
    deps.log.error('link preview attach failed', { err: error, postId });
    return false;
  }
};
