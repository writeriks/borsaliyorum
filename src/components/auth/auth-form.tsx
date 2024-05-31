"use client";

import * as React from "react";
import { z } from "zod";

import { LoginForm } from "@/components/auth/login-form";
import { LoginWithProviders } from "@/components/auth/login-with-provider";
import { RegisterForm } from "@/components/auth/register-form";
import {
  loginFormSchema,
  registerFormSchema,
} from "@/components/auth/common-auth";

enum FormType {
  Login = "login",
  Register = "register",
}

export function AuthForm() {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [formType, setFormType] = React.useState<FormType>(FormType.Login);

  const onSubmit = (
    values: z.infer<typeof loginFormSchema | typeof registerFormSchema>
  ) => {
    console.log(values);

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="grid gap-4">
      {formType === FormType.Login ? (
        <LoginForm
          onRegisterClick={() => setFormType(FormType.Register)}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      ) : (
        <RegisterForm
          onLoginClick={() => setFormType(FormType.Login)}
          onSubmit={onSubmit}
          isLoading={isLoading}
        />
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">veya</span>
        </div>
      </div>
      <LoginWithProviders isLoading={isLoading} />
    </div>
  );
}
