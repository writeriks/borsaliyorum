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
  signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      console.log(result);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  signOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out with Google:", error);
    }
  };

  signInWithEmailAndPassword = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log(result);
    } catch (error) {
      console.error("Error during signing in:", error);
    }
  };

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

  sendPasswordResetEmail = async (email: string) => {
    try {
      const result = await sendPasswordResetEmail(auth, email);

      console.log(result);
    } catch (error) {
      console.error("Error sending reset password email:", error);
    }
  };

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
