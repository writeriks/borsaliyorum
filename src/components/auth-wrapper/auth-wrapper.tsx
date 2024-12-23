import { headers } from 'next/headers';
import { User } from '@prisma/client';
import { verifyUserAuthenticationForServerPage } from '@/services/user-service/user-service';
import { generateRedirectUrl } from '@/utils/api-utils/api-utils';

// Higher-order function to wrap pages with authentication
export function withAuthentication(
  Page: (props: any & { currentUser: User }) => Promise<React.ReactNode>
) {
  return async (props: any): Promise<React.ReactNode> => {
    const { locale } = props.params;

    const redirectUrl = generateRedirectUrl(locale, '/', headers());

    try {
      // Check if the user is authenticated (for now, we assume the user is null)
      const currentUser = await verifyUserAuthenticationForServerPage();

      // If no user is found, redirect to login page
      if (!currentUser) {
        return (
          <div>
            <meta httpEquiv='refresh' content={`0; url=${redirectUrl.toString()}`} />
          </div>
        );
      }

      // If the user is authenticated, proceed to the page
      return Page({ ...props, currentUser });
    } catch {
      return (
        <div>
          <meta httpEquiv='refresh' content={`0; url=${redirectUrl.toString()}`} />
        </div>
      );
    }
  };
}
