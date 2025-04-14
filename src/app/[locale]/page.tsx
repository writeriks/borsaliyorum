import { headers } from 'next/headers';

import { verifyUserAuthenticationForServerPage } from '@/services/user-service/user-service';
import { generateRedirectUrl } from '@/utils/api-utils/api-utils';
import LandingPageFeed from '@/components/landing-page/landing-page-feed/landing-page-feed';
import PageWrapper from '@/components/page-wrapper/page-wrapper';

const Home = async (props: any): Promise<React.ReactNode> => {
  try {
    const currentUser = await verifyUserAuthenticationForServerPage();

    if (currentUser) {
      const redirectUrl = generateRedirectUrl(props.params.locale, '/feed', headers());
      return (
        <div>
          <meta httpEquiv='refresh' content={`0; url=${redirectUrl.toString()}`} />
        </div>
      );
    }
  } catch {
    // ignore error
  }

  return (
    <PageWrapper>
      <div className='min-h-screen'>
        <LandingPageFeed />
      </div>
    </PageWrapper>
  );
};

export default Home;
