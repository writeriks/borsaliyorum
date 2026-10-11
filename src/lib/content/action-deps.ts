import 'server-only';

import { headers } from 'next/headers';

import type { SessionUser } from '@/lib/auth/types';
import { getIpEncryptionKey } from '@/lib/crypto/key';
import { getDb } from '@/lib/db';
import type { Logger } from '@/lib/logger';
import { readRequestMeta } from '@/lib/request-meta';

import type { WriteDeps } from './write-deps';

/** Server Action'da yazma servislerinin gerçek bağımlılıkları (istek IP'si 5651 kaydı için). */
export const actionWriteDeps = async (user: SessionUser, log: Logger): Promise<WriteDeps> => ({
  db: getDb(),
  user,
  meta: readRequestMeta(await headers()),
  ipKey: getIpEncryptionKey,
  now: () => new Date(),
  log,
});
