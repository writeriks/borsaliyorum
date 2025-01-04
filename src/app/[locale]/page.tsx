import About from '@/components/landing-page/about/about';
import CallToAction from '@/components/landing-page/call-to-action/call-to-action';
import Features from '@/components/landing-page/features/features';
import Footer from '@/components/landing-page/footer/footer';
import Hero from '@/components/landing-page/hero/hero';
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

  return (
    <>
      <Hero />
      <Features />
      <About />
      <CallToAction />
      <Footer />
    </>
  );
};

export default Home;
