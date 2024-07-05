import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useDispatch, useSelector } from "react-redux";

import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/services/firebase-service/firebase-config";

import userService from "@/services/user-service/user-service";
import {
  setIsAuthLoading,
  setIsAuthModalOpen,
} from "@/store/reducers/ui-reducer/ui-slice";
import { UserState, setUser } from "@/store/reducers/user-reducer/user-slice";
import userReducerSelector from "@/store/reducers/user-reducer/user-reducer-selector";

import { User } from "@/services/firebase-service/types/db-types/user";

const useUser = (): UserState => {
  const dispatch = useDispatch();
  const userState = useSelector(userReducerSelector.getUser);

  const router = useRouter();
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userData = (await userService.getUserById(user.uid)) as User;

        // register case
        if (!userData) {
          dispatch(setIsAuthModalOpen(false));
          return;
        }

        // login case
        if (userData && !userState.isAuthenticated) {
          // Add more data if needed
          const { displayName, username, email, profilePhoto } = userData;
          dispatch(
            setUser({
              displayName,
              username,
              email,
              isAuthenticated: true,
              profilePhoto,
            })
          );

          dispatch(setIsAuthModalOpen(false));
        }
      } else {
        dispatch(
          setUser({
            username: "",
            displayName: "",
            email: "",
            profilePhoto: "",
            isAuthenticated: false,
          })
        );
        await userService.logOutUser();
        router.push("/");
      }

      if (window.location.pathname === "/feed") {
        dispatch(setIsAuthLoading(false));
      }
    });

    return () => unsubscribe();
  }, [dispatch, userState.isAuthenticated, router]);

  return userState;
};

export default useUser;
