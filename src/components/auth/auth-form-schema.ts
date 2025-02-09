import { isValidUsername } from '@/utils/user-utils/user-utils';
import { z } from 'zod';

export const passwordConstants = {
  // TODO: Add secure password validation
  minLength: 8,
  minLengthMessage: 'Şifre en az 8 karakter içermelidir.',
};

export const emailConstants = {
  minLength: 1,
  maxLength: 120,
  minLengthMessage: 'E-posta adresi boş olamaz.',
  maxLengthMessage: 'E-posta 120 karakterden az olmalıdır.',
  notValidMessage: 'Bu geçerli bir e-posta adresi değil.',
};

export const usernameConstants = {
  minLength: 3,
  minLengthMessage: 'Kullanıcı adı 3 karakterden fazla olmalıdır.',
  maxLength: 20,
  maxLengthMessage: 'Kullanıcı adı 20 karakterden az olmalıdır.',
  notValidMessage:
    'Kullanıcı adları 3-20 karakter uzunluğunda harf (a-z), rakam (0-9) ve alt tire (_) içerebilir.',
};

const displayNameConstants = {
  minLength: 5,
  minLengthMessage: 'Ad Soyad 5 karakterden az olamaz.',
  maxLength: 80,
  maxLengthMessage: 'Ad Soyad 80 karakterden uzun olamaz.',
};

export const emailValidationProps = {
  email: z
    .string()
    .min(emailConstants.minLength, { message: emailConstants.minLengthMessage })
    .max(emailConstants.maxLength, { message: emailConstants.maxLengthMessage })
    .email(emailConstants.notValidMessage),
};

export const usernameValidationProps = {
  username: z
    .string()
    .min(usernameConstants.minLength, {
      message: usernameConstants.minLengthMessage,
    })
    .max(usernameConstants.maxLength, {
      message: usernameConstants.maxLengthMessage,
    })
    .refine(val => isValidUsername(val), {
      message: usernameConstants.notValidMessage,
    }),
};

export const commonValidationProps = {
  ...emailValidationProps,
  password: z.string().min(passwordConstants.minLength, {
    message: passwordConstants.minLengthMessage,
  }),
};

export const loginFormSchema = z.object(commonValidationProps);
export const resetPasswordSchema = z.object(emailValidationProps);

export const registerFormSchema = z.object({
  ...commonValidationProps,
  ...usernameValidationProps,

  displayName: z
    .string()
    .min(displayNameConstants.minLength, {
      message: displayNameConstants.minLengthMessage,
    })
    .max(displayNameConstants.maxLength, {
      message: displayNameConstants.maxLengthMessage,
    }),
});
