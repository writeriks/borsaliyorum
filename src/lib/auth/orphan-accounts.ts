/**
 * Kaydı tamamlanmamış Firebase hesaplarının imhası (docs/legal/auth-metinleri.md, değerlendirme
 * 7; KVKK md.4 "gerektiği kadar saklama", md.7). Firebase hesabı kayıt/Google girişinde oluşur;
 * `User` satırı ancak onboarding'de yazılır. 30 gün içinde onboarding'i bitirmeyen hesabın
 * e-postası Firebase'de süresiz kalmasın.
 *
 * Geri alınamaz bir toplu silme olduğu için frenleri var (ADR-0001 "Yetim hesap imhası"):
 * DB ortam etiketi ↔ Firebase projesi eşleşmesi, boş `User` tablosunda iptal, sayfa başına aday
 * oranı ≤ %20, koşu başına en fazla 200 silme, sayfalar arası bekleme.
 *
 * `server-only` içermez: `scripts/purge-retention.ts` (GitHub Actions) düz Node'da çağırır.
 * Firebase Admin ve DB bağımlılık olarak verilir; testler mock'lar.
 */
import type { Queryable } from '@/lib/db/retention';

import { SESSION_MAX_AGE_MS } from './cookies';

export const ORPHAN_ACCOUNT_RETENTION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Son girişten bu yana oturum çerezi ömrü (14 gün) + 1 gün geçmeyen hesap silinmez: 25. günde
 * giriş yapan kullanıcının çerezi 39. güne kadar geçerlidir ve onboarding'i o sürede her an
 * tamamlayabilir. Daha kısa bir pay, formu doldururken hesabın silinmesine yol açar.
 */
export const ORPHAN_RECENT_ACTIVITY_GRACE_MS = SESSION_MAX_AGE_MS + DAY_MS;
/** Firebase Admin `listUsers` ve `deleteUsers` üst sınırı. */
export const FIREBASE_BATCH_SIZE = 1000;
/** Tek koşuda silinebilecek en fazla hesap (kalanı sonraki günlerin koşularına kalır). */
export const ORPHAN_PURGE_MAX_DELETIONS = 200;
/**
 * Bir sayfada aday / taranan oranı bunu aşarsa o sayfa silinmeden iş durur. Normalde yetim hesap
 * azınlıktır; yüksek oran yanlış DB'ye bağlanıldığını (herkes "yetim" görünür) gösterir.
 */
export const ORPHAN_PURGE_MAX_PAGE_PERCENT = 20;
/** Sayfalar arası bekleme (Firebase Admin kota/hız sınırı ve gözlemlenebilirlik için). */
export const ORPHAN_PURGE_PAGE_DELAY_MS = 1000;

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
  /** `SELECT count(*) FROM "User"`: 0 ise yanlış/boş DB, iş iptal. */
  readonly countUsers: () => Promise<number>;
  /** DB'nin bağlı olduğu Firebase projesi (`DeploymentEnvironment`); etiket yoksa null. */
  readonly readEnvironmentProjectId: () => Promise<string | null>;
  readonly sleep: (ms: number) => Promise<void>;
  readonly now: () => Date;
};

export type OrphanPurgeOptions = {
  readonly dryRun: boolean;
  /** Bağlanılan Firebase projesi (`FIREBASE_PROJECT_ID`). */
  readonly expectedProjectId: string;
};

export type OrphanPurgeSummary = {
  readonly dryRun: boolean;
  readonly scanned: number;
  readonly candidates: number;
  readonly deleted: number;
  readonly failed: number;
  /** Koşu başına üst sınıra ulaşıldı (dry-run'da: ulaşılacaktı). */
  readonly capped: boolean;
};

export type OrphanPurgeAbortReason =
  'environment-unlabeled' | 'environment-mismatch' | 'empty-user-table' | 'page-ratio';

/** Fren devreye girdi: hiçbir şey (o sayfada) silinmedi. Script non-zero çıkar. */
export class OrphanPurgeAbortError extends Error {
  readonly reason: OrphanPurgeAbortReason;

  constructor(reason: OrphanPurgeAbortReason, message: string) {
    super(message);
    this.name = 'OrphanPurgeAbortError';
    this.reason = reason;
  }
}

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

const assertEnvironment = async (
  deps: OrphanPurgeDeps,
  expectedProjectId: string
): Promise<void> => {
  const label = await deps.readEnvironmentProjectId();
  if (label === null) {
    throw new OrphanPurgeAbortError(
      'environment-unlabeled',
      'DB ortam etiketi (DeploymentEnvironment) yok; yetim hesap imhası çalışmaz.'
    );
  }
  if (label !== expectedProjectId) {
    throw new OrphanPurgeAbortError(
      'environment-mismatch',
      'DB ortam etiketi FIREBASE_PROJECT_ID ile eşleşmiyor; yanlış DB ya da yanlış proje.'
    );
  }
  if ((await deps.countUsers()) === 0) {
    throw new OrphanPurgeAbortError(
      'empty-user-table',
      'User tablosu boş; her hesap yetim görünür, imha iptal edildi.'
    );
  }
};

/**
 * Tüm Firebase hesaplarını sayfa sayfa tarar; 30 günden eski, son girişi oturum ömründen eski ve
 * `User` satırı olmayanları siler (`dryRun`: yalnızca sayar). Frenler yukarıda. Tekrar
 * çalıştırılabilir; yarıda kalırsa sonraki koşu devam eder. Yalnızca sayılar döner: uid/e-posta
 * loglanmaz.
 */
export const purgeOrphanFirebaseAccounts = async (
  deps: OrphanPurgeDeps,
  { dryRun, expectedProjectId }: OrphanPurgeOptions
): Promise<OrphanPurgeSummary> => {
  await assertEnvironment(deps, expectedProjectId);

  const now = deps.now();
  let scanned = 0;
  let candidates = 0;
  let deleted = 0;
  let failed = 0;
  let pageToken: string | undefined;
  let first = true;

  do {
    if (!first) await deps.sleep(ORPHAN_PURGE_PAGE_DELAY_MS);
    first = false;

    const page = await deps.listUsers(FIREBASE_BATCH_SIZE, pageToken);
    scanned += page.users.length;
    const old = page.users.filter(account => isPastRetention(account, now)).map(a => a.uid);
    if (old.length > 0) {
      const withUser = await deps.findUidsWithUser(old);
      const orphans = old.filter(uid => !withUser.has(uid));
      // Tam sayı karşılaştırması (0.2 * n kayan nokta hatası vermesin)
      if (orphans.length * 100 > page.users.length * ORPHAN_PURGE_MAX_PAGE_PERCENT) {
        throw new OrphanPurgeAbortError(
          'page-ratio',
          `Bir sayfadaki aday oranı %${ORPHAN_PURGE_MAX_PAGE_PERCENT} sınırını aştı ` +
            `(${orphans.length}/${page.users.length}); silinmedi.`
        );
      }
      candidates += orphans.length;
      const allowed = orphans.slice(0, ORPHAN_PURGE_MAX_DELETIONS - (deleted + failed));
      if (!dryRun && allowed.length > 0) {
        const result = await deps.deleteUsers(allowed);
        deleted += result.successCount;
        failed += result.failureCount;
      }
    }
    pageToken = page.pageToken;
    // Gerçek koşuda sınıra ulaşınca dur: kalan hesaplar sonraki koşuya
  } while (pageToken && (dryRun || deleted + failed < ORPHAN_PURGE_MAX_DELETIONS));

  const capped = dryRun
    ? candidates > ORPHAN_PURGE_MAX_DELETIONS
    : deleted + failed >= ORPHAN_PURGE_MAX_DELETIONS;
  return { dryRun, scanned, candidates, deleted, failed, capped };
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

/** `countUsers`'ın pg uygulaması. */
export const createUserCounter =
  (db: Queryable): OrphanPurgeDeps['countUsers'] =>
  async () => {
    const result = await db.query('SELECT count(*)::int AS n FROM "User"');
    return Number((result.rows[0] as { n?: unknown } | undefined)?.n ?? 0);
  };

/** `readEnvironmentProjectId`'nin pg uygulaması (tek satırlık `DeploymentEnvironment`). */
export const createEnvironmentReader =
  (db: Queryable): OrphanPurgeDeps['readEnvironmentProjectId'] =>
  async () => {
    const result = await db.query(
      'SELECT "firebaseProjectId" FROM "DeploymentEnvironment" WHERE "id" = 1'
    );
    const value = (result.rows[0] as { firebaseProjectId?: unknown } | undefined)
      ?.firebaseProjectId;
    return typeof value === 'string' ? value : null;
  };
