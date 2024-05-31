import { z } from "zod";

export const loginFormSchema = z.object({
  password: z.string().min(8, {
    message: "Şifre en az 8 karakter içermelidir.",
  }),
  email: z
    .string()
    .min(1, { message: "E-posta adresi boş olamaz." })
    .email("Bu geçerli bir e-posta adresi değil."),
});

export const registerFormSchema = z.object({
  password: z.string().min(8, {
    message: "Şifre en az 8 karakter içermelidir.",
  }),
  email: z
    .string()
    .min(1, { message: "E-posta adresi boş olamaz." })
    .email("Bu geçerli bir e-posta adresi değil."),
  username: z.string().min(1, { message: "Kullanıcı adı boş olamaz." }),
});
