/**
 * Kaydı tamamlanmamış Firebase hesaplarının imhası (docs/legal/auth-metinleri.md, değerlendirme
 * 7; KVKK md.4 "gerektiği kadar saklama", md.7). Firebase hesabı kayıt/Google girişinde oluşur;
 * `User` satırı ancak onboarding'de yazılır. 30 gün içinde onboarding'i bitirmeyen hesabın
 * e-postası Firebase'de süresiz kalmasın.
 *
 * `server-only` içermez: `scripts/purge-retention.ts` (GitHub Actions) düz Node'da çağırır.
 * Firebase Admin ve DB bağımlılık olarak verilir; testler mock'lar.
 */
import type { Queryable } from '@/lib/db/retention';

export const ORPHAN_ACCOUNT_RETENTION_DAYS = 30;
/**
 * Son 24 saatte giriş yapmış hesap atlanır: 30. günden sonra dönüp onboarding'i tam o sırada
 * dolduran kullanıcının hesabı formun ortasında silinmesin. Bir sonraki koşuda yine aday olur.
 */
export const ORPHAN_RECENT_ACTIVITY_GRACE_MS = 24 * 60 * 60 * 1000;
/** Firebase Admin `listUsers` ve `deleteUsers` üst sınırı. */
export const FIREBASE_BATCH_SIZE = 1000;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `UserRecord`'un ihtiyaç duyulan kısmı (zamanlar Firebase'in UTC metin biçiminde). */
export type FirebaseAccount = {
  readonly uid: string;
  readonly metadata: {
    readonly creationTime: string;
    readonly lastSignInTime?: string | null;
    readonly lastRefreshTime?: string | null;
  };
};

export type OrphanPurgeDeps = {
  readonly listUsers: (
    maxResults: number,
    pageToken?: string
  ) => Promise<{ users: readonly FirebaseAccount[]; pageToken?: string }>;
  readonly deleteUsers: (uids: string[]) => Promise<{ successCount: number; failureCount: number }>;
  /** Verilen uid'lerden `User` satırı olanlar (onboarding'i tamamlamış ya da eski hesap). */
  readonly findUidsWithUser: (uids: readonly string[]) => Promise<ReadonlySet<string>>;
  readonly now: () => Date;
};

export type OrphanPurgeSummary = {
  readonly dryRun: boolean;
  readonly scanned: number;
  readonly candidates: number;
  readonly deleted: number;
  readonly failed: number;
};

const parseTime = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
};

/**
 * Yaşı dolmuş mu? Oluşturma zamanı okunamıyorsa (beklenmeyen biçim) hesap SİLİNMEZ: imha
 * geri alınamaz, şüphede tutulur.
 */
export const isPastRetention = (account: FirebaseAccount, now: Date): boolean => {
  const created = parseTime(account.metadata.creationTime);
  if (created === null) return false;
  if (now.getTime() - created <= ORPHAN_ACCOUNT_RETENTION_DAYS * DAY_MS) return false;
  const lastActive = Math.max(
    parseTime(account.metadata.lastSignInTime) ?? 0,
    parseTime(account.metadata.lastRefreshTime) ?? 0
  );
  return now.getTime() - lastActive > ORPHAN_RECENT_ACTIVITY_GRACE_MS;
};

/**
 * Tüm Firebase hesaplarını sayfa sayfa tarar; 30 günden eski ve `User` satırı olmayanları siler
 * (`dryRun`: yalnızca sayar). Tekrar çalıştırılabilir; yarıda kalırsa sonraki koşu devam eder.
 * Yalnızca sayılar döner: uid/e-posta loglanmaz.
 */
export const purgeOrphanFirebaseAccounts = async (
  deps: OrphanPurgeDeps,
  { dryRun }: { dryRun: boolean }
): Promise<OrphanPurgeSummary> => {
  const now = deps.now();
  let scanned = 0;
  let candidates = 0;
  let deleted = 0;
  let failed = 0;
  let pageToken: string | undefined;

  do {
    const page = await deps.listUsers(FIREBASE_BATCH_SIZE, pageToken);
    scanned += page.users.length;
    const old = page.users.filter(account => isPastRetention(account, now)).map(a => a.uid);
    if (old.length > 0) {
      const withUser = await deps.findUidsWithUser(old);
      const orphans = old.filter(uid => !withUser.has(uid));
      candidates += orphans.length;
      if (!dryRun && orphans.length > 0) {
        const result = await deps.deleteUsers(orphans);
        deleted += result.successCount;
        failed += result.failureCount;
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  return { dryRun, scanned, candidates, deleted, failed };
};

/** `findUidsWithUser`'ın pg uygulaması (script ve integration testi aynı kodu kullanır). */
export const createUidLookup =
  (db: Queryable): OrphanPurgeDeps['findUidsWithUser'] =>
  async uids => {
    if (uids.length === 0) return new Set();
    const result = await db.query(
      'SELECT "firebaseUserId" FROM "User" WHERE "firebaseUserId" = ANY($1::text[])',
      [uids]
    );
    return new Set(
      result.rows.map(row => String((row as { firebaseUserId: unknown }).firebaseUserId))
    );
  };
