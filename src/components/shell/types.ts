/** Kabuğun ihtiyaç duyduğu kadar kullanıcı bilgisi (PublicUser'ın alt kümesi; e-posta/uid yok). */
export type ShellUser = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

/**
 * Kabuğun gördüğü oturum durumu. `unknown` iken giriş/kayıt UI'ı ASLA render edilmez; aynı
 * ölçüde skeleton gösterilir (auth-session). S5'e kadar sayfalar `unknown` geçer; S5'ten sonra
 * sunucu `getCurrentUser()` sonucundan `anonymous | authenticated` gelir.
 */
export type ShellViewer =
  { status: 'unknown' } | { status: 'anonymous' } | { status: 'authenticated'; user: ShellUser };

export const UNKNOWN_VIEWER: ShellViewer = { status: 'unknown' };
