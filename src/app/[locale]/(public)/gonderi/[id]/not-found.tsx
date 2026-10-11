import { FileQuestion } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';

import { AppShell } from '@/components/shell/app-shell';
import { EmptyState } from '@/components/states/empty-state';
import { Button } from '@/components/ui/button';
import { PostDetailHeader } from '@/features/posts/components/post-detail-header';
import { Link } from '@/i18n/navigation';

/**
 * Gönderiye özel 404: olmayan, silinmiş (moderasyon dahil), engelli ya da yazarı etkin olmayan
 * gönderi ve geçersiz kimlik için tek metin; hangi nedenin geçerli olduğu söylenmez. noindex
 * (`notFoundPostMetadata`). Ana sayfa girişli kullanıcıyı sunucuda akışa yönlendirir.
 */
const PostNotFound = (): ReactElement => {
  const t = useTranslations('postDetail');
  return (
    <AppShell>
      <div className='flex flex-col' data-testid='post-not-found'>
        <PostDetailHeader title={t('title')} fallbackHref='/' />
        <EmptyState
          icon={FileQuestion}
          message={t('notFound')}
          action={
            <Button asChild variant='outline' size='lg'>
              <Link href='/'>{t('toHome')}</Link>
            </Button>
          }
        />
      </div>
    </AppShell>
  );
};

export default PostNotFound;
