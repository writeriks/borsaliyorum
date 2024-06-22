"use client";

import { useState } from "react";
import { z } from "zod";

import { LoginForm } from "@/components/auth/login-form";
import { LoginWithProviders } from "@/components/auth/login-with-provider";
import { RegisterForm } from "@/components/auth/register-form";
import {
  loginFormSchema,
  registerFormSchema,
} from "@/components/auth/auth-service/common-auth";
import firebaseAuthService from "@/services/firebase-service/firebase-auth-service";
import { ResetPassword } from "@/components/auth/reset-password";

enum FormType {
  Login = "login",
  Register = "register",
  ResetPassword = "resetPassword",
}

export function AuthForm() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formType, setFormType] = useState<FormType>(FormType.Login);

  const onSubmit = async (
    values: z.infer<typeof loginFormSchema & typeof registerFormSchema>
  ) => {
    console.log(values);
    setIsLoading(true);

    if (formType === FormType.Login) {
      await firebaseAuthService.signInWithEmailAndPassword(
        values.email,
        values.password
      );
    } else if (formType === FormType.Register) {
      const isUserAdded = await firebaseAuthService.signUpWithEmailAndPassword(
        values.username,
        values.displayName,
        values.email,
        values.password
      );
      if (isUserAdded) {
        setFormType(FormType.Login);
      }
    } else {
      await firebaseAuthService.sendPasswordResetEmail(values.email);
    }

    setIsLoading(false);
  };

  const renderFormScreen = (formType: FormType) => {
    switch (formType) {
      case FormType.ResetPassword:
        return (
          <ResetPassword
            onLoginClick={() => setFormType(FormType.Login)}
            onSubmit={onSubmit}
            isLoading={isLoading}
          />
        );

      case FormType.Register:
        return (
          <RegisterForm
            onLoginClick={() => setFormType(FormType.Login)}
            onSubmit={onSubmit}
            isLoading={isLoading}
          />
        );

      default:
        return (
          <LoginForm
            onRegisterClick={() => setFormType(FormType.Register)}
            onResetPasswordClick={() => setFormType(FormType.ResetPassword)}
            onSubmit={onSubmit}
            isLoading={isLoading}
          />
        );
    }
  };

  return (
    <div className="grid gap-4">
      {renderFormScreen(formType)}
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
