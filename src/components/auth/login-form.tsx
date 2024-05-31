"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
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
import { loginFormSchema } from "@/components/auth/common-auth";

interface LoginFormProps {
  isLoading: boolean;
  onSubmit(values: z.infer<typeof loginFormSchema>): void;
  onRegisterClick(): void;
}

export function LoginForm({
  isLoading,
  onRegisterClick,
  onSubmit,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      password: "",
      email: "",
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
          name="email"
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
          )}{" "}
          Giriş
        </Button>
        <p className="text-center">
          <Button onClick={onRegisterClick} type="button" variant="link">
            Üye değil misiniz? Hemen kaydolun!
          </Button>
        </p>
      </form>
    </Form>
  );
}
