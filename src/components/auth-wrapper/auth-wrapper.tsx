import { verifyUserAuthenticationForServerPage } from '@/services/user-service/user-service';
import { User } from '@prisma/client';
import { headers } from 'next/headers';

// Higher-order function to wrap pages with authentication
export function withAuthentication(
  Page: (props: any & { currentUser: User }) => Promise<React.ReactNode>
) {
  return async (props: any): Promise<React.ReactNode> => {
    const { locale } = props.params;

    const headersList = headers();
    const host = headersList.get('host') || 'localhost:3000'; // Fallback for local dev
    const protocol = headersList.get('x-forwarded-proto') || 'http'; // Fallback for local dev
    const baseUrl = `${protocol}://${host}`;
    const redirectUrl = new URL(`/${locale}/`, baseUrl);

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
    } catch (error) {
      return (
        <div>
          <meta httpEquiv='refresh' content={`0; url=${redirectUrl.toString()}`} />
        </div>
      );
    }
  };
}
