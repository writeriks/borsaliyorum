import { headers } from 'next/headers';

import Discover from '@/components/discover/discover';

import { verifyUserAuthenticationForServerPage } from '@/services/user-service/user-service';
import { generateRedirectUrl } from '@/utils/api-utils/api-utils';
import LandingPageFeed from '@/components/landing-page/landing-page-feed/landing-page-feed';

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
    <div className='flex min-w-full justify-center'>
      <LandingPageFeed />
      <div className='lg:flex max-1500:hidden sticky top-[156px] ml-2 h-[260px] flex-col lg:w-[260px]'>
        <Discover />
      </div>
    </div>
  );
};

export default Home;
