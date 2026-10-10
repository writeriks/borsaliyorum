import type { ReactElement, ReactNode } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { requireUser } from '@/lib/auth/session';

/**
 * Oturum gerektiren sayfalar. Gerçek kontrol burada (proxy yalnızca çerezin varlığına bakar):
 * geçersiz/iptal edilmiş çerez → tek bir `/giris?next=…` yönlendirmesi; giriş sayfası anonim
 * kullanıcıyı geri yollamadığı için döngü olmaz. Sayfalar da kendi verilerinde yetkiyi
 * ayrıca kontrol eder (Data Access Layer).
 */
const AppLayout = async ({ children }: { children: ReactNode }): Promise<ReactElement> => {
  const user = await requireUser();
  return (
    <AppShell
      viewer={{
        status: 'authenticated',
        user: { username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
      }}
    >
      {children}
    </AppShell>
  );
};

export default AppLayout;
