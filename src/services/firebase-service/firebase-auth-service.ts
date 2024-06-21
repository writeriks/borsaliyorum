import userService from "@/services/user-service/user-service";
import { auth } from "./firebase-config";
import {
  GoogleAuthProvider,
  User as FirebaseUser,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  reauthenticateWithCredential,
  AuthCredential,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  User,
  UserEnum,
} from "@/services/firebase-service/types/db-types/user";
import { Timestamp } from "firebase/firestore";

class FirebaseAuthService {
  /**
   * Signs in the user using Google authentication.
   */
  signInWithGoogle = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const { user } = result;
      const userDocument = await userService.getUserById(user.uid);

      if (userDocument) {
        // When sign in with Google, email is automatically verified. Need to update in user collection
        await userService.syncUser(user, userDocument);
      } else {
        // If new user, add user to the user collection
        const customUser: User = {
          [UserEnum.USER_ID]: user.uid,
          [UserEnum.CREATED_AT]: Timestamp.now(),
          [UserEnum.EMAIL]: user.email as string,
          [UserEnum.USERNAME]: user.email as string,
          [UserEnum.DISPLAY_NAME]: user.displayName as string,
          [UserEnum.IS_EMAIL_VERIFIED]: user.emailVerified,
          [UserEnum.PROFILE_PHOTO]: user.photoURL ?? undefined,
        };

        await userService.addUser(customUser);
      }
      console.log(result);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  /**
   * Signs out the currently authenticated user.
   */
  signOut = async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  /**
   * Signs in the user using email and password authentication.
   * @param email - The user's email address
   * @param password - The user's password
   */
  signInWithEmailAndPassword = async (
    email: string,
    password: string
  ): Promise<void> => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userDocument = await userService.getUserById(user.uid);
      if (userDocument) {
        await userService.syncUser(user, userDocument);
      }
    } catch (error) {
      console.error("Error during signing in:", error);
    }
  };

  /**
   * Signs up the user using email and password authentication.
   * @param username - The user's username
   * @param email - The user's email address
   * @param password - The user's password
   */
  signUpWithEmailAndPassword = async (
    username: string,
    displayName: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      await userService.validateUser(username, email, displayName);

      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const { user } = result;
      await userService.sendEmailVerification(user);

      const customUser: User = {
        [UserEnum.USER_ID]: user.uid,
        [UserEnum.CREATED_AT]: Timestamp.now(),
        [UserEnum.EMAIL]: user.email as string,
        [UserEnum.USERNAME]: username,
        [UserEnum.DISPLAY_NAME]: displayName,
        [UserEnum.IS_EMAIL_VERIFIED]: user.emailVerified,
      };

      await userService.addUser(customUser);
    } catch (error) {
      console.error("Error during signing up:", error);
      return false;
    }

    return true;
  };

  /**
   * Sends a password reset email to the user.
   * @param email - The user's email address
   */
  sendPasswordResetEmail = async (email: string): Promise<void> => {
    try {
      const result = await sendPasswordResetEmail(auth, email);
      console.log(result);
    } catch (error) {
      console.error("Error sending reset password email:", error);
    }
  };

  /**
   * Reauthenticates the user with given credentials.
   * @param user - The user to reauthenticate
   * @param credentials - The authentication credentials
   */
  reauthenticateWithCredential = async (
    user: FirebaseUser,
    credentials: AuthCredential
  ): Promise<void> => {
    try {
      const result = await reauthenticateWithCredential(user, credentials);
      console.log(result);
    } catch (error) {
      console.error("Error during reauthentication:", error);
    }
  };
}

const firebaseAuthService = new FirebaseAuthService();
export default firebaseAuthService;
