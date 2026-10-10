import type { Prisma } from '@/generated/prisma/client';

import type { SessionUser, UserRole } from './types';

/** Oturum çözümü için gereken alanlar; tek sorguda (rol dahil) okunur. */
export const sessionUserSelect = {
  userId: true,
  firebaseUserId: true,
  username: true,
  displayName: true,
  email: true,
  profilePhoto: true,
  isEmailVerified: true,
  onboardedAt: true,
  sessionsValidAfter: true,
  status: true,
  roles: { select: { role: true } },
} as const satisfies Prisma.UserSelect;

export type SessionUserRecord = Prisma.UserGetPayload<{ select: typeof sessionUserSelect }>;

export const toSessionUser = (record: SessionUserRecord): SessionUser => ({
  userId: record.userId,
  username: record.username,
  displayName: record.displayName,
  avatarUrl: record.profilePhoto,
  email: record.email,
  emailVerified: record.isEmailVerified,
  roles: record.roles.map(({ role }): UserRole => role),
});
