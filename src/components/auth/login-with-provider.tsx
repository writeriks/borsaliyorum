"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/ui/icons";
import { Label } from "@/components/ui/label";
import { LoginForm } from "@/components/auth/login-form";

interface LoginWithProvidersProps {
  isLoading: boolean;
}
export function LoginWithProviders({ isLoading }: LoginWithProvidersProps) {
  return (
    <div className="grid space-y-2">
      <Button variant="outline" type="button" disabled={isLoading}>
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.google className="mr-2" />
        )}
        Google ile devam et
      </Button>

      <Button variant="outline" type="button" disabled={isLoading}>
        {isLoading ? (
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Icons.facebook className="mr-2" />
        )}
        Facebook ile devam et
      </Button>
    </div>
  );
}
