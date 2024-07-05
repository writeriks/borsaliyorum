"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

import { Icons } from "@/components/ui/icons";

import firebaseAuthService from "@/services/firebase-service/firebase-auth-service";

interface LoginWithProvidersProps {
  isLoading: boolean;
}
export const LoginWithProviders = ({
  isLoading,
}: LoginWithProvidersProps): React.ReactNode => {
  return (
    <div className="grid space-y-2">
      <Button
        onClick={() => firebaseAuthService.signInWithGoogle()}
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
};
