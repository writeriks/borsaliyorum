type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * `/dev/*` önizleme sayfaları (Playwright fixture'ları) yalnızca geliştirme ve test ortamında
 * açılır. E2E prod build'i (`next start`) `ENABLE_DEV_PAGES=1` ile başlatılır. Vercel production'da
 * bayrak tanımlansa bile kapalıdır. Değer istek anında okunur (sayfa dinamik), build'e gömülmez.
 */
export const devPagesEnabled = (env: EnvSource = process.env): boolean => {
  if (env.VERCEL_ENV === 'production') return false;
  return env.NODE_ENV === 'development' || env.NODE_ENV === 'test' || env.ENABLE_DEV_PAGES === '1';
};
