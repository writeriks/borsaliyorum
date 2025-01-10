'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { editProfileSchema, EditProfileFormValues } from './edit-profile-form-schema';
import ImageUploader from '@/components/image-uploader/image-uploader';
import { useMutation } from '@tanstack/react-query';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { useDispatch } from 'react-redux';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Plus } from 'lucide-react';
import { Icons } from '@/components/ui/icons';

interface EditProfileFormProps {
  editProfileProps: EditProfileFormValues;
}

export const EditProfileForm: React.FC<EditProfileFormProps> = ({ editProfileProps }) => {
  const [imageData, setImageData] = useState<string>('');
  const dispatch = useDispatch();
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { displayName, bio, birthday, location, profilePhoto, username, website } =
    editProfileProps;

  const form = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      displayName: displayName || '',
      bio: bio || '',
      location: location || '',
      birthday: birthday ? new Date(birthday).toISOString().split('T')[0] : '',
      website: website || '',
      username: username || '',
      profilePhoto: profilePhoto || '',
    },
  });

  const mutation = useMutation({
    mutationFn: ({ formData }: { formData: EditProfileFormValues }) =>
      userApiService.updateUserProfile(formData as any),
    onSuccess: () => {
      dispatch(
        setUINotification({
          message: t('EditProfile.successMessage'),
          notificationType: UINotificationEnum.SUCCESS,
        })
      );
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

  const handleFormSubmit = (values: EditProfileFormValues): void => {
    mutation.mutate({
      formData: {
        ...values,
        profilePhoto: imageData || editProfileProps?.profilePhoto,
      },
    });
  };

  const defaultProfilePhoto =
    'https://firebasestorage.googleapis.com/v0/b/borsa-yorum-dev.appspot.com/o/images%2Fprofile-icon-placeholder.png?alt=media&token=df8f3c1b-23e6-4704-8d6e-da45096bafc6';
  const proxyUrl = editProfileProps?.profilePhoto
    ? `/api/image-proxy?imageUrl=${encodeURIComponent(editProfileProps?.profilePhoto)}`
    : `/api/image-proxy?imageUrl=${encodeURIComponent(defaultProfilePhoto)}`;

  const imageNode = imageData ? (
    <Image
      src={imageData}
      width={100}
      height={100}
      alt={t('EditProfile.imagePreviewAlt')}
      className='w-full h-full object-cover rounded-full'
    />
  ) : (
    <div className='w-full h-full rounded-full bg-gray-200 flex items-center justify-center'>
      <Image
        src={proxyUrl}
        width={100}
        height={100}
        alt={t('EditProfile.imagePreviewAlt')}
        className='w-full h-full object-cover rounded-full'
      />
    </div>
  );

  return (
    <>
      <h1 className='text-2xl font-bold mb-4'>{t('EditProfile.editProfile')}</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className='space-y-4'>
          <div className='flex items-center justify-center space-x-4 mb-4'>
            <ImageUploader
              fileInputRef={fileInputRef}
              onImageUpload={setImageData}
              disabled={mutation.isPending}
              // eslint-disable-next-line react/no-children-prop
              children={
                <div className='relative group w-full h-full rounded-full '>
                  {imageNode}
                  <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-full transition-opacity duration-300'>
                    <span className='text-white text-2xl font-bold'>
                      <Plus />{' '}
                    </span>
                  </div>
                </div>
              }
              className='w-28 h-28 rounded-full'
            />
          </div>

          <FormField
            control={form.control}
            name='username'
            disabled
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('EditProfile.username')}</FormLabel>
                <FormControl>
                  <Input type='text' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='displayName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('EditProfile.displayName')}</FormLabel>
                <FormControl>
                  <Input type='text' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='bio'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('EditProfile.bio')}</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='location'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('EditProfile.location')}</FormLabel>
                <FormControl>
                  <Input type='text' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='birthday'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('EditProfile.birthday')}</FormLabel>
                <FormControl>
                  <Input type='date' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='website'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('EditProfile.website')}</FormLabel>
                <FormControl>
                  <Input type='text' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            variant={'default'}
            className='w-full hover:bg-blue-500 hover:text-white bg-bluePrimary text-white'
            type='submit'
          >
            {mutation.isPending ? (
              <>
                <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                <span>{t('EditProfile.savingChanges')}</span>
              </>
            ) : (
              <span>{t('EditProfile.saveChanges')}</span>
            )}
          </Button>
        </form>
      </Form>
    </>
  );
};
