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

  const handleOnError = (error: Error): void => {
    dispatch(
      setUINotification({
        message: error.message ?? t('Common.errorMessage'),
        notificationType: UINotificationEnum.ERROR,
      })
    );
  };

  const handleOnSuccess = (): void => {
    dispatch(
      setUINotification({
        message: t('Settings.successMessage'),
        notificationType: UINotificationEnum.SUCCESS,
      })
    );
  };

  const deleteAccountMutation = useMutation({
    mutationFn: () => userApiService.deleteUser(),
    onSuccess: () => {
      setTimeout(async () => {
        await userApiService.logOutUser();
      }, 500);
    },
    onError: handleOnError,
  });

  const updateUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      await userApiService.updateUsername(username);
    },
    onError: handleOnError,
    onSuccess: () => {
      handleOnSuccess();
      setIsChangingUsername(false);
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async ({ email: newUserEmail, newPassword }: SettingsFormValues) => {
      if (isChangingEmail && currentPasswordFromModal && newUserEmail) {
        await userApiService.updateUserEmail(newUserEmail, email!, currentPasswordFromModal);
      }
      if (isChangingPassword && currentPasswordFromModal && newPassword) {
        await userApiService.updateUserPassword(currentPasswordFromModal, newPassword, email!);
      }
    },
    onError: handleOnError,
    onSuccess: () => {
      handleOnSuccess();
      setTimeout(() => {
        location.reload();
      }, 1000);
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

  const handleUsernameSubmit = async (): Promise<void> => {
    const isValid = await form.trigger('username');
    if (isValid) {
      updateUsernameMutation.mutate(form.getValues().username);
    }
  };

  const handleFormSubmit = async (): Promise<void> => {
    const formValues = form.getValues();
    if (isChangingEmail && formValues.email === email) {
      form.setError('email', {
        type: 'manual',
        message: t('Settings.sameEmailError'),
      });

      return;
    } else {
      form.clearErrors('email');
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

  const renderField = ({
    label,
    fieldName,
    type = 'text',
    isEditing,
    disabled = false,
    hideSaveButton = false,
    hideCancelButton = false,
    onToggleEdit,
    onSave,
    isLoading,
    control,
    t: translate,
  }: {
    label: string;
    fieldName: keyof SettingsFormValues;
    type?: string;
    isEditing: boolean;
    disabled?: boolean;
    hideSaveButton?: boolean;
    hideCancelButton?: boolean;
    onToggleEdit?: () => void;
    onSave: () => void;
    isLoading: boolean;
    control: any;
    t: any;
  }): React.ReactNode => (
    <FormField
      control={control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{translate(label)}</FormLabel>
          <div className='flex items-center space-x-2'>
            <FormControl>
              <Input type={type} {...field} disabled={!isEditing || disabled} />
            </FormControl>
            {isEditing && !hideSaveButton && (
              <Button
                className='hover:bg-blue-500 hover:text-white bg-bluePrimary text-white'
                type='button'
                onClick={onSave}
              >
                {isLoading ? (
                  <>
                    <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                    <span>{translate('Settings.saving')}</span>
                  </>
                ) : (
                  <span>{translate('Settings.save')}</span>
                )}
              </Button>
            )}
            {!hideCancelButton && (
              <Button variant='link' type='button' onClick={onToggleEdit}>
                {isEditing ? translate('Settings.cancel') : translate('Settings.change')}
              </Button>
            )}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

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
          {renderField({
            label: 'Common.username',
            fieldName: 'username',
            isEditing: isChangingUsername,
            onToggleEdit: () => {
              form.clearErrors('username');
              form.setValue('username', usernameFromProp);
              setIsChangingUsername(!isChangingUsername);
            },
            onSave: () => {
              handleUsernameSubmit();
            },
            isLoading: updateUsernameMutation.isPending,
            control: form.control,
            t,
          })}

          {!isGoogleSignIn && (
            <>
              {renderField({
                label: 'Common.email',
                fieldName: 'email',
                type: 'email',
                isEditing: isChangingEmail,
                onToggleEdit: () => {
                  form.clearErrors('email');
                  form.setValue('email', email);
                  if (isChangingEmail) {
                    setIsChangingEmail(false);
                  } else {
                    // user cannot change email and password at the same time
                    setIsChangingEmail(true);
                    setIsChangingPassword(false);
                  }
                },
                onSave: openPasswordModal,
                isLoading: updateSettingsMutation.isPending,
                control: form.control,
                t,
                disabled: isGoogleSignIn,
              })}

              {!isChangingPassword ? (
                <FormItem>
                  <FormLabel>{t('Settings.currentPassword')}</FormLabel>
                  <div className='flex items-center space-x-2'>
                    <Input type='password' value='********' disabled />
                    <Button
                      variant='link'
                      type='button'
                      onClick={() => {
                        // user cannot change email and password at the same time
                        setIsChangingPassword(true);
                        setIsChangingEmail(false);
                      }}
                    >
                      {t('Settings.change')}
                    </Button>
                  </div>
                </FormItem>
              ) : (
                <>
                  {renderField({
                    label: 'Settings.newPassword',
                    fieldName: 'newPassword',
                    hideCancelButton: true,
                    hideSaveButton: true,
                    type: 'password',
                    isEditing: true,
                    onSave: openPasswordModal,
                    isLoading: updateSettingsMutation.isPending,
                    control: form.control,
                    t,
                  })}
                  {renderField({
                    label: 'Settings.confirmPassword',
                    fieldName: 'confirmPassword',
                    type: 'password',
                    isEditing: true,
                    onSave: openPasswordModal,
                    onToggleEdit: () => {
                      form.clearErrors('newPassword');
                      form.clearErrors('confirmPassword');
                      form.setValue('newPassword', '');
                      form.setValue('confirmPassword', '');
                      if (isChangingPassword) {
                        setIsChangingPassword(false);
                      }
                    },
                    isLoading: updateSettingsMutation.isPending,
                    control: form.control,
                    t,
                  })}
                </>
              )}
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
          handleFormSubmit();
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
