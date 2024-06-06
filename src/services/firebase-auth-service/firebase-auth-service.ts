import userService from "@/services/user-service/user-service";
import { auth } from "../firebase-service/firebase-config";
import {
  GoogleAuthProvider,
  User,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  reauthenticateWithCredential,
  AuthCredential,
  sendPasswordResetEmail,
} from "firebase/auth";

class FirebaseAuthService {
  /**
   * Signs in the user using Google authentication.
   */
  signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      console.log(result);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  /**
   * Signs out the currently authenticated user.
   */
  signOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out with Google:", error);
    }
  };

  /**
   * Signs in the user using email and password authentication.
   * @param email - The user's email address
   * @param password - The user's password
   */
  signInWithEmailAndPassword = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log(result);
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
    email: string,
    password: string
  ) => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await userService.sendEmailVerification(result.user);
      // TODO create user with extra fields
      console.log(result);
    } catch (error) {
      console.error("Error during signing up:", error);
    }
  };

  /**
   * Sends a password reset email to the user.
   * @param email - The user's email address
   */
  sendPasswordResetEmail = async (email: string) => {
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
    user: User,
    credentials: AuthCredential
  ) => {
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
