'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/ui/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { resetPasswordSchema } from '@/components/auth/auth-service/common-auth';

interface ResetPasswordProps {
  isLoading: boolean;
  onSubmit(values: z.infer<typeof resetPasswordSchema>): void;
  onLoginClick(): void;
}

export const ResetPassword = ({
  isLoading,
  onSubmit,
  onLoginClick,
}: ResetPasswordProps): React.ReactNode => {
  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-3 gap-6'>
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-posta</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className='w-full' type='submit'>
          {isLoading && <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />}
          Şifre yenileme isteği gönder
        </Button>
        <Button onClick={onLoginClick} className=' float-right ' variant='link' type='button'>
          <span>&#8592; Giriş ekranına dön</span>
        </Button>
      </form>
    </Form>
  );
};
