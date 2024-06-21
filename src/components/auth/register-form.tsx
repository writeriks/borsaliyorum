"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Eye, EyeOff } from "lucide-react";
import { registerFormSchema } from "@/components/auth/auth-service/common-auth";

interface RegisterFormProps {
  isLoading: boolean;
  onSubmit(values: z.infer<typeof registerFormSchema>): void;
  onLoginClick(): void;
}

export function RegisterForm({
  isLoading,
  onLoginClick,
  onSubmit,
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof registerFormSchema>>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      password: "",
      email: "",
      username: "",
      displayName: "",
    },
  });

  const eyeProps = {
    onClick: () => setShowPassword(!showPassword),
    style: {
      position: "relative",
      right: "10px",
      bottom: "39px",
      cursor: "pointer",
    },
  } as any;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 gap-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kullanıcı Adı</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ad Soyad</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-posta</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Şifre</FormLabel>
              <FormControl>
                <Input type={showPassword ? "input" : "password"} {...field} />
              </FormControl>
              <span style={{ float: "right" }}>
                {showPassword ? (
                  <EyeOff {...eyeProps} />
                ) : (
                  <Eye {...eyeProps} />
                )}
              </span>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit">
          {isLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            ""
          )}
          Kaydol
        </Button>
        <p className="text-center">
          <Button onClick={onLoginClick} type="button" variant="link">
            Zaten üye misiniz? Giriş yapın!
          </Button>
        </p>
      </form>
    </Form>
  );
}
