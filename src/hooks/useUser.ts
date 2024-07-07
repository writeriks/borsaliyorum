import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/services/firebase-service/firebase-config";
import userService from "@/services/user-service/user-service";
import { User } from "@/services/firebase-service/types/db-types/user";
import { UserState, setUser } from "@/store/reducers/user-reducer/user-slice";
import { useDispatch, useSelector } from "react-redux";
import userReducerSelector from "@/store/reducers/user-reducer/user-reducer-selector";
import {
  setIsAuthLoading,
  setIsAuthModalOpen,
} from "@/store/reducers/ui-reducer/ui-slice";

const useUser = (): UserState => {
  const dispatch = useDispatch();
  const userState = useSelector(userReducerSelector.getUser);

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
        if (userData && !userState.username) {
          // Add more data if needed
          const { displayName, username, email, profilePhoto } = userData;
          dispatch(
            setUser({
              displayName,
              username,
              email,
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
          })
        );
      }

      if (window.location.pathname === "/feed") {
        dispatch(setIsAuthLoading(false));
      }
    });

    return () => unsubscribe();
  }, []);

  return userState;
};

export default useUser;
