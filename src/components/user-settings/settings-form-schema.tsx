import {
  emailValidationProps,
  passwordConstants,
  usernameValidationProps,
} from '@/components/auth/auth-form-schema';
import { z } from 'zod';

export enum SettingsFormFieldsEnum {
  USERNAME = 'username',
  EMAIL = 'email',
  NEW_PASSWORD = 'newPassword',
  CONFIRM_PASSWORD = 'confirmPassword',
}

export const settingsSchema = z
  .object({
    ...usernameValidationProps,
    ...emailValidationProps,
    newPassword: z
      .string()
      .min(passwordConstants.minLength, { message: passwordConstants.minLengthMessage }),
    confirmPassword: z
      .string()
      .min(passwordConstants.minLength, { message: passwordConstants.minLengthMessage }),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor.',
    path: ['confirmPassword'],
  });

export type SettingsFormValues = z.infer<typeof settingsSchema>;
