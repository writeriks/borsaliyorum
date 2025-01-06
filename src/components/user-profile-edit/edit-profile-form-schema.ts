import { z } from 'zod';

export const editProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, 'Ad Soyad boş olamaz')
    .max(80, 'Ad Soyad 80 karakterden uzun olamaz'),
  bio: z.string().optional(),
  location: z.string().optional(),
  profilePhoto: z.string().optional(),
  birthday: z.string().optional(),
  website: z.string().optional(),
  username: z.string().optional(),
});

export type EditProfileFormValues = z.infer<typeof editProfileSchema>;
