"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { LoginForm } from "@/components/auth/login-form";
import firebaseAuthService from "@/services/firebase-service/firebase-auth-service";
import { useDispatch } from "react-redux";

interface LoginWithProvidersProps {
  isLoading: boolean;
}
export function LoginWithProviders({ isLoading }: LoginWithProvidersProps) {
  const loginWithGoogle = () => {
    firebaseAuthService.signInWithGoogle();
  };

  return (
    <div className="grid space-y-2">
      <Button
        onClick={loginWithGoogle}
        variant="outline"
        type="button"
        disabled={isLoading}
      >
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.google className="mr-2" />
        )}
        Google ile devam et
      </Button>
    </div>
  );
}
