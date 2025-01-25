'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { settingsSchema, SettingsFormValues } from './settings-form-schema';
import { useMutation } from '@tanstack/react-query';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { useDispatch } from 'react-redux';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { useTranslations } from 'next-intl';
import { Icons } from '@/components/ui/icons';
import { TriangleAlertIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DeleteAccountModal } from '@/components/user-settings/delete-account-modal';
import useUser from '@/hooks/useUser';
import { ConfirmPasswordModal } from '@/components/user-settings/confirm-password-modal';

interface SettingsFormProps {
  settingsProps: SettingsFormValues;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ settingsProps }) => {
  const dispatch = useDispatch();
  const t = useTranslations();
  const { fbAuthUser } = useUser();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPasswordFromModal, setCurrentPasswordFromModal] = useState('');
  const [isGoogleSignIn, setIsGoogleSignIn] = useState(
    fbAuthUser?.providerData[0].providerId === 'google.com'
  );
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isChangingUsername, setIsChangingUsername] = useState(false);

  const { email, username: usernameFromProp } = settingsProps;

  useEffect(() => {
    setIsGoogleSignIn(fbAuthUser?.providerData[0].providerId === 'google.com');
  }, [fbAuthUser]);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      username: usernameFromProp || '',
      email: email || '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => userApiService.deleteUser(),
    onSuccess: () => {
      setTimeout(async () => {
        await userApiService.logOutUser();
      }, 500);
    },
    onError: error => {
      dispatch(
        setUINotification({
          message: error.message ?? t('Common.errorMessage'),
          notificationType: UINotificationEnum.ERROR,
        })
      );
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async ({ email: newUserEmail, newPassword, username }: SettingsFormValues) => {
      if (isChangingEmail && newUserEmail) {
        await userApiService.updateUserEmail(newUserEmail, email!, currentPasswordFromModal!);
      }
      if (isChangingPassword && currentPasswordFromModal && newPassword) {
        await userApiService.updateUserPassword(currentPasswordFromModal, newPassword, email!);
      }
      if (isChangingUsername && username) {
        await userApiService.updateUsername(username);
      }
    },
    onError: error => {
      dispatch(
        setUINotification({
          message: error.message ?? t('Common.errorMessage'),
          notificationType: UINotificationEnum.ERROR,
        })
      );
    },
    onSuccess: () => {
      dispatch(
        setUINotification({
          message: t('Settings.successMessage'),
          notificationType: UINotificationEnum.SUCCESS,
        })
      );
      setIsChangingEmail(false);
      setIsChangingPassword(false);
      setIsChangingUsername(false);
    },
  });

  const openPasswordModal = async (): Promise<void> => {
    let isValid = true;

    if (isChangingEmail) {
      isValid = await form.trigger('email');
    } else if (isChangingPassword) {
      isValid = await form.trigger(['newPassword', 'confirmPassword']);
    }

    if (isValid) {
      setCurrentPasswordFromModal('');
      setIsPasswordModalOpen(true);
    }
  };

  const handleFormSubmit = async (formValues: SettingsFormValues): Promise<void> => {
    if (isChangingEmail && formValues.email === email) {
      form.setError('email', {
        type: 'manual',
        message: t('Settings.sameEmailError'),
      });

      return;
    } else {
      form.clearErrors('email');
    }

    if (isChangingUsername) {
      const isValidUsername = await form.trigger('username');
      if (!isValidUsername) {
        return;
      }
    }

    if (isChangingPassword && formValues.newPassword === currentPasswordFromModal) {
      form.setError('newPassword', {
        type: 'manual',
        message: t('Settings.samePasswordError'),
      });

      return;
    }
    updateSettingsMutation.mutate(formValues);
  };

  return (
    <>
      <h1 className='text-2xl font-bold mb-4'>{t('Settings.settings')}</h1>
      {isGoogleSignIn && (
        <Alert className='mb-2' variant='warning'>
          <TriangleAlertIcon color='#E9E4B3' className='h-4 w-4' />
          <AlertTitle className='font-bold'>{t('Common.warning')}</AlertTitle>
          <AlertDescription className='text-xs'>{t('Settings.googleSignInInfo')}</AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form className='space-y-4'>
          <FormField
            control={form.control}
            name='username'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Common.username')}</FormLabel>
                <div className='flex items-center space-x-2'>
                  <FormControl>
                    <Input type='text' {...field} disabled={!isChangingUsername} />
                  </FormControl>

                  {isChangingUsername && (
                    <Button
                      className=' hover:bg-blue-500 hover:text-white bg-bluePrimary text-white'
                      type='button'
                      onClick={() => handleFormSubmit(form.getValues())}
                    >
                      {updateSettingsMutation.isPending ? (
                        <>
                          <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                          <span>{t('Settings.saving')}</span>
                        </>
                      ) : (
                        <span>{t('Settings.save')}</span>
                      )}
                    </Button>
                  )}

                  <Button
                    variant='link'
                    type='button'
                    onClick={() => setIsChangingUsername(!isChangingUsername)}
                  >
                    {isChangingUsername ? t('Settings.cancel') : t('Settings.change')}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Common.email')}</FormLabel>
                <div className='flex items-center space-x-2'>
                  <FormControl>
                    <Input type='email' {...field} disabled={!isChangingEmail || isGoogleSignIn} />
                  </FormControl>
                  {!isGoogleSignIn && (
                    <>
                      {isChangingEmail && (
                        <Button
                          className=' hover:bg-blue-500 hover:text-white bg-bluePrimary text-white'
                          type='button'
                          onClick={openPasswordModal}
                        >
                          {updateSettingsMutation.isPending ? (
                            <>
                              <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                              <span>{t('Settings.saving')}</span>
                            </>
                          ) : (
                            <span>{t('Settings.save')}</span>
                          )}
                        </Button>
                      )}

                      <Button
                        variant='link'
                        type='button'
                        onClick={() => setIsChangingEmail(!isChangingEmail)}
                      >
                        {isChangingEmail ? t('Settings.cancel') : t('Settings.change')}
                      </Button>
                    </>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isChangingPassword && (
            <FormItem>
              <FormLabel>{t('Settings.currentPassword')}</FormLabel>
              <div className='flex items-center space-x-2'>
                <Input type='password' value={isChangingPassword ? '' : '********'} disabled />
                {!isGoogleSignIn && (
                  <Button variant='link' type='button' onClick={() => setIsChangingPassword(true)}>
                    {t('Settings.change')}
                  </Button>
                )}
              </div>
            </FormItem>
          )}

          {isChangingPassword && (
            <>
              <FormField
                control={form.control}
                name='newPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Settings.newPassword')}</FormLabel>
                    <FormControl>
                      <Input type='password' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Settings.confirmPassword')}</FormLabel>
                    <div className='flex items-center space-x-2'>
                      <FormControl>
                        <Input type='password' {...field} />
                      </FormControl>
                      <Button
                        className=' hover:bg-blue-500 hover:text-white bg-bluePrimary text-white'
                        type='button'
                        onClick={openPasswordModal}
                      >
                        {updateSettingsMutation.isPending ? (
                          <>
                            <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                            <span>{t('Settings.saving')}</span>
                          </>
                        ) : (
                          <span>{t('Settings.save')}</span>
                        )}
                      </Button>{' '}
                      <Button
                        variant='link'
                        type='button'
                        onClick={() => setIsChangingPassword(false)}
                      >
                        {t('Settings.cancel')}
                      </Button>
                    </div>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <Button
            variant='link'
            className='w-full text-destructive'
            type='button'
            onClick={() => setIsDeleteModalOpen(true)}
          >
            {deleteAccountMutation.isPending ? (
              <>
                <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                <span>{t('Settings.deletingAccount')}</span>
              </>
            ) : (
              <span>{t('Settings.deleteAccount')}</span>
            )}
          </Button>
        </form>
      </Form>
      <ConfirmPasswordModal
        isOpen={isPasswordModalOpen}
        currentPassword={currentPasswordFromModal}
        onCurrentPasswordChange={setCurrentPasswordFromModal}
        onOpenChange={() => setIsPasswordModalOpen(!isPasswordModalOpen)}
        onConfirmPassword={() => {
          handleFormSubmit(form.getValues());
          setIsPasswordModalOpen(false);
        }}
      />
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onConfirmDelete={() => deleteAccountMutation.mutate()}
        onOpenChange={() => setIsDeleteModalOpen(!isDeleteModalOpen)}
      />
    </>
  );
};
