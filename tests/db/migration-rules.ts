/**
 * Expand fazı migration kuralları (ADR-0001 "Expand-only", ADR-0003 "Yıkıcı ifade taraması").
 * Saf fonksiyonlar; `scripts/check-migrations.ts` ve unit testleri kullanır.
 */
const CONTRACT_MARKER = /^--\s*migration:contract\b/;

/**
 * v1 (Prisma 5) migration'ları: prod'da v2'den önce uygulanmış baseline. Dokunulmaz (checksum
 * korunur); yıkıcı ifade taramasından ve rollback zorunluluğundan muaftır.
 */
export const LEGACY_MIGRATIONS = [
  '20250105143157_test_user_roles',
  '20250105154711_add_security_role_id',
  '20250105155936_add_security_role',
  '20250129182225_notication_model',
] as const;

/** Contract (yıkıcı) migration'ları dosyanın ilk satırında bu işareti taşır ve taramadan muaftır. */
export const isContractMigration = (sql: string): boolean => CONTRACT_MARKER.test(sql);

export const stripComments = (sql: string): string =>
  sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');

/** Dolar tırnaklı gövdeleri ($$ ... $$) dışarıda bırakarak ifade sayar. */
export const countStatements = (sql: string): number =>
  stripComments(sql)
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .split(';')
    .filter(part => part.trim().length > 0).length;

/** Expand fazında yasak ifadeleri döner (boş = uygun). Yorumlar yok sayılır. */
export const findDestructive = (sql: string): string[] => {
  const code = stripComments(sql);
  const problems: string[] = [];
  if (/\bDROP\b/i.test(code)) problems.push('DROP');
  if (/\bRENAME\b/i.test(code)) problems.push('RENAME');
  if (/\bALTER\s+COLUMN\s+\S+\s+(SET\s+DATA\s+)?TYPE\b/i.test(code)) {
    problems.push('ALTER ... TYPE');
  }
  if (/\bSET\s+NOT\s+NULL\b/i.test(code)) problems.push('SET NOT NULL');
  for (const match of code.matchAll(/\bADD\s+COLUMN\b[^,;]*/gi)) {
    if (/\bNOT\s+NULL\b/i.test(match[0]) && !/\bDEFAULT\b/i.test(match[0])) {
      problems.push(`DEFAULT'suz NOT NULL kolon: ${match[0].trim().replace(/\s+/g, ' ')}`);
    }
  }
  return problems;
};
