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
  sendEmailVerification,
} from 'firebase/auth';
import store from '@/store/redux-store';
import {
  UINotificationEnum,
  setIsAuthLoading,
  setIsAuthModalOpen,
  setUINotification,
} from '@/store/reducers/ui-reducer/ui-slice';
import { queryClient } from '@/components/tanstack-provider/tanstack-provider';
import userApiService from '@/services/api-service/user-api-service/user-api-service';
import { User } from '@prisma/client';

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

  dispatchAuthLoading = (value: boolean): void => {
    store.dispatch(setIsAuthLoading(value));
  };

  /**
   * Signs in the user using Google authentication.
   */
  signInWithGoogle = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();

    try {
      store.dispatch(setIsAuthLoading(true));
      const result = await signInWithPopup(auth, provider);
      const { user } = result;

      const userDocument = await userApiService.getUserById(user.uid);

      if (userDocument) {
        // When sign in with Google, email is automatically verified. Need to update in user collection
        await userApiService.syncGmailLogin(user, userDocument);
      } else {
        // If new user, add user to the database
        const customUser: Partial<User> = {
          firebaseUserId: user.uid,
          createdAt: new Date(),
          email: user.email as string,
          username: user.email as string,
          displayName: user.displayName as string,
          isEmailVerified: user.emailVerified,
          profilePhoto: user.photoURL,
        };

        await queryClient.fetchQuery({
          queryKey: ['addUser', customUser],
          queryFn: () => userApiService.addUser(customUser),
        });
      }

      await queryClient.fetchQuery({
        queryKey: ['validate-user', user],
        queryFn: () => userApiService.validateUser(user),
      });

      window.location.pathname = '/feed';
    } catch (error: any) {
      console.error('Error signing in with Google:', error);
      this.dispatchError(error);
      this.dispatchAuthLoading(false);
    }
  };

  /**
   * Signs out the currently authenticated user.
   */
  signOut = async (): Promise<void> => {
    try {
      await signOut(auth);
      await queryClient.fetchQuery({
        queryKey: ['logOutUser'],
        queryFn: () => userApiService.logOutUser(),
      });
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
      store.dispatch(setIsAuthLoading(true));
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const userDocument = await userApiService.getUserById(user.uid);

      await queryClient.fetchQuery({
        queryKey: ['validate-user', user],
        queryFn: () => userApiService.validateUser(user),
      });
      if (userDocument) {
        await userApiService.syncGmailLogin(user, userDocument);
      }

      window.location.pathname = '/feed';
    } catch (error: any) {
      console.error('Error during signing in:', error);
      this.dispatchError(error);
      this.dispatchAuthLoading(false);
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
      store.dispatch(setIsAuthLoading(true));

      await queryClient.fetchQuery({
        queryKey: ['check-if-user-exist', username, email, displayName],
        queryFn: () => userApiService.checkIfUserExist(username, email, displayName),
      });

      const result = await createUserWithEmailAndPassword(auth, email, password);
      const { user } = result;
      await sendEmailVerification(user);

      const customUser: Partial<User> = {
        firebaseUserId: user.uid,
        createdAt: new Date(),
        email: user.email as string,
        username: username,
        displayName: displayName,
        isEmailVerified: user.emailVerified,
      };

      await queryClient.fetchQuery({
        queryKey: ['addUser', customUser],
        queryFn: () => userApiService.addUser(customUser),
      });

      await queryClient.fetchQuery({
        queryKey: ['validate-user', user],
        queryFn: () => userApiService.validateUser(user),
      });

      store.dispatch(setIsAuthModalOpen(false));

      store.dispatch(
        setUINotification({
          message: 'Hesabınız başarıyla oluşturuldu. Şimdi giriş yapabilirsiniz.',
          notificationType: UINotificationEnum.SUCCESS,
        })
      );

      window.location.pathname = '/feed';

      return true;
    } catch (error: any) {
      store.dispatch(setIsAuthModalOpen(false));
      this.dispatchError(error);
      this.dispatchAuthLoading(false);

      return false;
    }
  };

  /**
   * Sends a password reset email to the user.
   * @param email - The user's email address
   */
  sendPasswordResetEmail = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
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
      await reauthenticateWithCredential(user, credentials);
    } catch (error: any) {
      console.error('Error during reauthentication:', error);
      this.dispatchError(error);
    }
  };
}

const firebaseAuthService = new FirebaseAuthService();
export default firebaseAuthService;
