import { withAuthentication } from '@/components/auth-wrapper/auth-wrapper';
import { SettingsForm } from '@/components/user-settings/settings-form';
import { User } from '@prisma/client';

interface SettingsProps {
  currentUser: User;
}

const EditProfilePage = async ({ currentUser }: SettingsProps): Promise<React.ReactNode> => {
  const settingsProps = {
    username: currentUser.username,
    email: currentUser.email,
    newPassword: '',
    confirmPassword: '',
  };

  return (
    <div className='container mx-auto px-4 py-8 sm:w-8/12'>
      <SettingsForm settingsProps={settingsProps} />
    </div>
  );
};

export default withAuthentication(EditProfilePage);
