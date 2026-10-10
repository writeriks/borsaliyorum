'use client';

import { useState } from 'react';

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
import { Eye, EyeOff } from 'lucide-react';
import { loginFormSchema } from '@/components/auth/auth-form-schema';

interface LoginFormProps {
  isLoading: boolean;
  onSubmit(values: z.infer<typeof loginFormSchema>): void;
  onRegisterClick(): void;
  onResetPasswordClick(): void;
}

export const LoginForm = ({
  isLoading,
  onRegisterClick,
  onResetPasswordClick,
  onSubmit,
}: LoginFormProps): React.ReactNode => {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      password: '',
      email: '',
    },
  });

  const eyeProps = {
    onClick: () => setShowPassword(!showPassword),
    style: {
      position: 'relative',
      right: '10px',
      bottom: '39px',
      cursor: 'pointer',
    },
  } as any;

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
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Şifre</FormLabel>

              <FormControl>
                <Input type={showPassword ? 'input' : 'password'} {...field} />
              </FormControl>
              <span className='float-right'>
                {showPassword ? <EyeOff {...eyeProps} /> : <Eye {...eyeProps} />}
              </span>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          onClick={onResetPasswordClick}
          className='w-1/6 float-right text-xs'
          variant='link'
          type='button'
        >
          Şifremi unuttum
        </Button>
        <Button className='w-full' type='submit'>
          {isLoading ? <Icons.spinner className='mr-2 h-4 w-4 animate-spin' /> : ''}
          Giriş
        </Button>
        <p className='text-center'>
          <Button onClick={onRegisterClick} type='button' variant='link'>
            Üye değil misiniz? Hemen kaydolun!
          </Button>
        </p>
      </form>
    </Form>
  );
};
