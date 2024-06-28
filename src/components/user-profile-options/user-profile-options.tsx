import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import firebaseAuthService from "@/services/firebase-service/firebase-auth-service";
import { Label } from "@/components/ui/label";
import useUser from "@/hooks/useUser";
import { AuthModal } from "@/components/auth/auth-modal";

const UserProfileOptions = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const user = useUser();

  const logout = async () => {
    await firebaseAuthService.signOut();
    setIsAuthModalOpen(false);
  };

  return (
    <div
      id="user-profile-section"
      className="min-h-44 flex p-2 flex-col border-black border-2 rounded-md"
    >
      {user ? (
        <div className="w-full h-full flex flex-col p-1">
          <div className="text-primary-text text-[13px] leading-[16px]">
            {`Hoşgeldin ${user.displayName ? user.displayName : user.username}`}
          </div>
          <div>
            <Button
              className="text-primary-text text-[13px] leading-[16px] p-0"
              variant="link"
              onClick={logout}
            >
              Çıkış Yap
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full h-full justify-center items-center">
          <Label className="capitalize m-1">Hemen şimdi kayıt ol</Label>
          {!user && (
            <Button
              className="w-48 m-1 text-lg font-medium bg-blue-600 rounded-full"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Giriş Yap
            </Button>
          )}
        </div>
      )}

      <AuthModal
        isOpen={!Boolean(user) && isAuthModalOpen}
        onAuthModalOpenChange={() => setIsAuthModalOpen(!isAuthModalOpen)}
      />
    </div>
  );
};

export default UserProfileOptions;
