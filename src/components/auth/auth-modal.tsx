"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AuthForm } from "@/components/auth/auth-form";

interface AuthModalProps {
  isOpen: boolean;
  onAuthModalOpenChange(): void;
}

export function AuthModal({ isOpen, onAuthModalOpenChange }: AuthModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onAuthModalOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yatırım Kulübüne Hoşgeldiniz</DialogTitle>
        </DialogHeader>
        <AuthForm />
      </DialogContent>
    </Dialog>
  );
}
