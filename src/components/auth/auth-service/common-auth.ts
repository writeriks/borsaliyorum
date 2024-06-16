import { z } from "zod";

const passwordConstants = {
  // TODO: Add secure password validation
  minLength: 8,
  minLengthMessage: "Şifre en az 8 karakter içermelidir.",
};

const emailConstants = {
  minLength: 1,
  minLengthMessage: "E-posta adresi boş olamaz.",
  notValidMessage: "Bu geçerli bir e-posta adresi değil.",
};

const usernameConstants = {
  minLength: 1,
  minLengthMessage: "Kullanıcı adı boş olamaz.",
};

const emailValidationProps = {
  email: z
    .string()
    .min(emailConstants.minLength, { message: emailConstants.minLengthMessage })
    .email(emailConstants.notValidMessage),
};

const commonValidationProps = {
  ...emailValidationProps,
  password: z.string().min(passwordConstants.minLength, {
    message: passwordConstants.minLengthMessage,
  }),
};

export const loginFormSchema = z.object(commonValidationProps);
export const resetPasswordSchema = z.object(emailValidationProps);

export const registerFormSchema = z.object({
  ...commonValidationProps,
  username: z.string().min(usernameConstants.minLength, {
    message: usernameConstants.minLengthMessage,
  }),
});
