import { withAuthentication } from '@/components/auth-wrapper/auth-wrapper';
import { EditProfileForm } from '@/components/user-profile-edit/edit-profile-form';
import { User } from '@prisma/client';

interface EditProfilePageProps {
  currentUser: User;
}

const EditProfilePage = async ({ currentUser }: EditProfilePageProps): Promise<React.ReactNode> => {
  const { displayName, bio, location, birthday, profilePhoto, website, username } = currentUser;

  const editProfileProps = {
    displayName,
    bio: bio ?? undefined,
    birthday: birthday?.toISOString().split('T')[0] ?? undefined,
    location: location ?? undefined,
    profilePhoto: profilePhoto ?? undefined,
    username,
    website: website ?? undefined,
  };

  return (
    <div className='container mx-auto px-4 py-8 sm:w-8/12'>
      <EditProfileForm editProfileProps={editProfileProps} />
    </div>
  );
};

export default withAuthentication(EditProfilePage);
