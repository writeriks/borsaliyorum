import { verifyUserAuthenticationForServerPage } from '@/services/user-service/user-service';
import { generateRedirectUrl } from '@/utils/api-utils/api-utils';
import { headers } from 'next/headers';

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

  return <div>Ana Sayfa</div>;
};

export default Home;
