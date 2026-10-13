import { createHash } from 'node:crypto';

/** `LinkPreview.urlHash`: normalize edilmiş URL'nin sha256'sı (hex, 64 karakter). */
export const previewUrlHash = (normalizedUrl: string): string =>
  createHash('sha256').update(normalizedUrl, 'utf8').digest('hex');
