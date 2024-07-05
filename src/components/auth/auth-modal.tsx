"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuthForm } from "@/components/auth/auth-form";

interface AuthModalProps {
  isOpen: boolean;
  onAuthModalOpenChange(): void;
}

export const AuthModal = ({
  isOpen,
  onAuthModalOpenChange,
}: AuthModalProps): React.ReactNode => (
  <Dialog open={isOpen} onOpenChange={onAuthModalOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Yatırım Kulübüne Hoşgeldiniz</DialogTitle>
      </DialogHeader>
      <AuthForm />
    </DialogContent>
  </Dialog>
);
