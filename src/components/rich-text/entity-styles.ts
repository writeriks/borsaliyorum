/**
 * Render'daki entity görünümleri (tasarım §3.2). Accent çevre metne ~2.2:1 olduğundan her türün
 * renk dışı bir ipucu var: cashtag chip zemini, hashtag/mention semibold + önek, URL alt çizgi + ↗.
 * `before:` dikey dokunma alanını satır yüksekliğini bozmadan ~32px'e genişletir.
 */
const HIT_AREA = 'relative before:absolute before:inset-x-0 before:-inset-y-1.5';

export const ENTITY_CLASS = {
  cashtag: `${HIT_AREA} rounded-sm bg-accent-subtle px-0.5 font-semibold text-accent tabular-nums box-decoration-clone transition-colors duration-(--duration-fast) hover:bg-bg-muted hover:underline`,
  hashtag: `${HIT_AREA} font-semibold text-accent hover:underline`,
  mention: `${HIT_AREA} font-semibold text-accent hover:underline`,
  url: `${HIT_AREA} text-accent underline decoration-1 underline-offset-2 hover:decoration-2`,
} as const;
