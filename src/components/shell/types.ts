/** Kabuğun ihtiyaç duyduğu kadar kullanıcı bilgisi (PublicUser'ın alt kümesi; e-posta/uid yok). */
export type ShellUser = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

/**
 * Kabuğun gördüğü oturum durumu. `unknown` iken giriş/kayıt UI'ı ASLA render edilmez; aynı
 * ölçüde skeleton gösterilir (auth-session). `needs-onboarding`: kimliği doğrulanmış ama
 * kullanıcı adı seçmemiş hesap; "Giriş yap" yerine "Kaydı tamamla" (→ /hos-geldin) görür.
 */
export type ShellViewer =
  | { status: 'unknown' }
  | { status: 'anonymous' }
  | { status: 'needs-onboarding' }
  | { status: 'authenticated'; user: ShellUser };

export const UNKNOWN_VIEWER: ShellViewer = { status: 'unknown' };
