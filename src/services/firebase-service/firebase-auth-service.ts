import userService from '@/services/user-service/user-service';
import { auth } from './firebase-config';
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
} from 'firebase/auth';
import { User, UserEnum } from '@/services/firebase-service/types/db-types/user';
import { Timestamp } from 'firebase/firestore';
import store from '@/store/redux-store';
import { UINotificationEnum, setUINotification } from '@/store/reducers/ui-reducer/ui-slice';

class FirebaseAuthService {
  genericErrorMessage = 'Bir hata oluştu.';

  dispatchError = (error: any): void => {
    store.dispatch(
      setUINotification({
        message: error?.message ?? this.genericErrorMessage,
        notificationType: UINotificationEnum.ERROR,
      })
    );
  };

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

      await userService.validateUser(user);

      window.location.pathname = '/feed';
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      this.dispatchError(error);
    }
  };

  /**
   * Signs out the currently authenticated user.
   */
  signOut = async (): Promise<void> => {
    try {
      await signOut(auth);
      await userService.logOutUser();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error signing out:', error);
      this.dispatchError(error);
    }
  };

  /**
   * Signs in the user using email and password authentication.
   * @param email - The user's email address
   * @param password - The user's password
   */
  signInWithEmailAndPassword = async (email: string, password: string): Promise<void> => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userDocument = await userService.getUserById(user.uid);

      await userService.validateUser(user);
      if (userDocument) {
        await userService.syncUser(user, userDocument);
      }

      window.location.pathname = '/feed';
    } catch (error: any) {
      console.error('Error during signing in:', error);
      this.dispatchError(error);
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
      await userService.checkIfUserExist(username, email, displayName);

      const result = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = result;
      await userService.sendEmailVerification(user);

      await userService.validateUser(user);

      const customUser: User = {
        [UserEnum.USER_ID]: user.uid,
        [UserEnum.CREATED_AT]: Timestamp.now(),
        [UserEnum.EMAIL]: user.email as string,
        [UserEnum.USERNAME]: username,
        [UserEnum.DISPLAY_NAME]: displayName,
        [UserEnum.IS_EMAIL_VERIFIED]: user.emailVerified,
      };

      await userService.addUser(customUser);

      window.location.pathname = '/feed';
    } catch (error: any) {
      console.error('Error during signing up:', error);
      this.dispatchError(error);

      return false;
    }

    store.dispatch(
      setUINotification({
        message: 'Hesabınız başarıyla oluşturuldu. Şimdi giriş yapabilirsiniz.',
        notificationType: UINotificationEnum.SUCCESS,
      })
    );

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
    } catch (error: any) {
      console.error('Error sending reset password email:', error);
      this.dispatchError(error);
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
    } catch (error: any) {
      console.error('Error during reauthentication:', error);
      this.dispatchError(error);
    }
  };
}

const firebaseAuthService = new FirebaseAuthService();
export default firebaseAuthService;
