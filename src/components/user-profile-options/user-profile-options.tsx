import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import firebaseAuthService from "@/services/firebase-service/firebase-auth-service";
import { Bell, LogOut, Settings, User } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import ThemeModeToggle from "@/components/theme-toggle/theme-toggle";
import { useDispatch, useSelector } from "react-redux";
import userReducerSelector from "@/store/reducers/user-reducer/user-reducer-selector";
import uiReducerSelector from "@/store/reducers/ui-reducer/ui-reducer-selector";
import { Skeleton } from "@/components/ui/skeleton";
import UserAvatar from "@/components/user-avatar/user-avatar";
import { setIsAuthModalOpen } from "@/store/reducers/ui-reducer/ui-slice";

const UserProfileOptions = () => {
  const dispatch = useDispatch();
  const user = useSelector(userReducerSelector.getUser);
  const isAuthLoading = useSelector(uiReducerSelector.getIsAuthLoading);

  const onProfileSelectChange = (value: any) => {
    switch (value) {
      case "view-profile":
        // TODO: route to profile
        break;
      case "edit-profile":
        // TODO: route to edit profile
        break;
      case "logout":
        logout();
        break;
      default:
        break;
    }
  };

  const logout = async () => {
    await firebaseAuthService.signOut();
    dispatch(setIsAuthModalOpen(false));
  };

  return isAuthLoading ? (
    <div className="flex items-center w-fit">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[150px]" />
        <Skeleton className="h-4 w-[100px]" />
      </div>
    </div>
  ) : (
    <div id="user-profile-section" className="flex flex-col">
      {user.username ? (
        <div className="w-full h-full flex flex-col p-1">
          <div>
            <Select value="" onValueChange={onProfileSelectChange}>
              <SelectTrigger className="w-full hover:bg-secondary border-none text-secondary-foreground dark:bg-transparent dark:hover:bg-secondary">
                <div className="flex items-center">
                  <UserAvatar /> <span className="ml-2"> Profil</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem className="cursor-pointer" value="view-profile">
                    Profilini Gör
                  </SelectItem>
                  <SelectItem className="cursor-pointer" value="edit-profile">
                    Profilini Düzenle
                  </SelectItem>
                  <SelectItem className="cursor-pointer group" value="logout">
                    <div className="flex text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Çıkış Yap
                    </div>
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <div>
              <Button
                variant="secondary"
                className="bg-transparent dark:bg-transparent dark:hover:bg-secondary"
              >
                <Bell className="mr-2 h-4 w-4" /> Bildirimler
              </Button>
            </div>
            <div>
              <Button
                variant="secondary"
                className="bg-transparent dark:bg-transparent dark:hover:bg-secondary"
              >
                <Settings className="mr-2 h-4 w-4" /> Ayarlar
              </Button>
            </div>
            <ThemeModeToggle />
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full h-full justify-center items-center">
          <Button
            className="w-48 m-1 text-lg font-medium bg-blue-600 rounded-full text-white"
            onClick={() => dispatch(setIsAuthModalOpen(true))}
          >
            Giriş Yap
          </Button>
        </div>
      )}
    </div>
  );
};

export default UserProfileOptions;
