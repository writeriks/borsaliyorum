import { withAuthentication } from '@/components/auth-wrapper/auth-wrapper';
import { EditProfileForm } from '@/components/user-profile-edit/edit-profile-form';
import { User } from '@prisma/client';

interface EditProfilePageProps {
  currentUser: User;
}

const EditProfilePage = async ({ currentUser }: EditProfilePageProps): Promise<React.ReactNode> => {
  const { displayName, bio, location, birthday, profilePhoto, website, username } = currentUser;

  const initialValues = {
    displayName,
    bio,
    location,
    birthday,
    website,
    username,
    profilePhoto,
  };

  return (
    <div className='container mx-auto px-4 py-8 sm:w-8/12'>
      <EditProfileForm initialValues={initialValues as any} />
    </div>
  );
};

export default withAuthentication(EditProfilePage);
