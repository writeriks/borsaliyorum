import {
  User as FirebaseUser,
  deleteUser,
  sendEmailVerification,
  updateEmail,
  updatePassword,
} from 'firebase/auth';

import { auth } from '../../firebase-service/firebase-config';

import firebaseOperations from '@/services/firebase-service/firebase-operations';

import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { User, UserEnum } from '@/services/firebase-service/types/db-types/user';
import { Timestamp } from 'firebase/firestore';
import store from '@/store/redux-store';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';

class UserApiService {
  /**
   * Sends an email verification to the provided Firebase user.
   * @param user - The Firebase user to send the email verification to.
   */
  sendEmailVerification = async (user: FirebaseUser): Promise<void> => {
    try {
      await sendEmailVerification(user);
    } catch (error) {
      console.error('Error sending email verification:', error);
    }
  };

  /**
   * Retrieves a user document by user ID.
   * @param userId - The ID of the user to retrieve.
   * @returns  The user document, or undefined if not found.
   */
  getUserById = async (userId: string): Promise<User | undefined> => {
    try {
      const userDoc = await firebaseOperations.getDocumentById(CollectionPath.Users, userId);

      return userDoc?.exists() ? (userDoc.data() as User) : undefined;
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  /**
   * Sends a request to public api to fetch users searched by username.
   * @param username - The username of the user to retrieve.
   * @returns  The user document array, or undefined if not found.
   */
  getUsersByName = async (username: string): Promise<User[] | undefined> => {
    try {
      const idToken = await auth.currentUser?.getIdToken();

      const result = await fetch(
        `/api/user/get-user-by-name?username=${encodeURIComponent(username)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return result.json();
    } catch (error) {
      store.dispatch(
        setUINotification({
          message: 'Bir hata oluştu.',
          notificationType: UINotificationEnum.ERROR,
        })
      );
    }
  };

  /**
   * Syncs the Firebase user data with the user document in Firestore.
   * @param user - The Firebase user to sync.
   * @param userDocument - The user document to update.
   */
  syncUser = async (user: FirebaseUser, userDocument: User): Promise<void> => {
    try {
      if (auth.currentUser) {
        if (
          user.email !== userDocument.email ||
          user.emailVerified !== userDocument.isEmailVerified
        ) {
          await firebaseOperations.updateDocumentById(CollectionPath.Users, userDocument.userId, {
            ...userDocument,
            [UserEnum.IS_EMAIL_VERIFIED]: user.emailVerified,
            [UserEnum.EMAIL]: user.email,
            [UserEnum.UPDATED_AT]: Timestamp.now(),
          });
        }
      }
    } catch (error) {
      console.error('Error syncing user:', error);
    }
  };

  /**
   * Updates the email address of the provided Firebase user.
   * @param user - The Firebase user to update.
   * @param newEmail - The new email address to set.
   */
  updateUserEmail = async (user: FirebaseUser, newEmail: string): Promise<void> => {
    try {
      if (auth.currentUser) {
        await updateEmail(user, newEmail);
      }
    } catch (error) {
      console.error('Error updating email:', error);
    }
  };

  /**
   * Updates the password of the provided Firebase user.
   * @param user - The Firebase user to update.
   * @param newPassword - The new password to set.
   */
  updateUserPassword = async (user: FirebaseUser, newPassword: string): Promise<void> => {
    try {
      if (auth.currentUser) {
        await updatePassword(user, newPassword);
      }
    } catch (error) {
      console.error('Error updating password:', error);
    }
  };

  /**
   * Deletes the provided Firebase user.
   * @param user - The Firebase user to delete.
   * @returns
   */
  deleteUser = async (user: FirebaseUser): Promise<void> => {
    try {
      if (auth.currentUser) {
        await deleteUser(user);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  /**
   * Adds a new user document to Firestore.
   * @param user - The user document to add.
   */
  addUser = async (user: User): Promise<void> => {
    const requestBody = {
      user,
    };
    const result = await fetch('/api/user/create-user', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!result.ok) throw new Error(result.statusText);
  };

  /**
   * Checks the new user to make sure username and email are not taken as well as other string validations.
   * @param username - username to check
   * @param email - email to check
   * @param displayName - displayName to check
   */
  checkIfUserExist = async (
    username: string,
    email: string,
    displayName: string
  ): Promise<void> => {
    const requestBody = {
      username,
      email,
      displayName,
    };
    const result = await fetch('/api/user/check-if-user-exist', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!result.ok) {
      const errorData = await result.json();
      throw new Error(errorData.error || 'Bir hata oluştu.');
    }
  };

  /**
   * Validates the provided Firebase user and assigns a session cookie.
   * @param user - The Firebase user to validate.
   */
  validateUser = async (user: FirebaseUser): Promise<void> => {
    const token = await user.getIdToken();

    const result = await fetch('/api/user/validate-user', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!result.ok) {
      const errorData = await result.json();
      throw new Error(errorData.error || 'Bir hata oluştu.');
    }
  };

  /**
   * Logs out the current user.
   */
  logOutUser = async (): Promise<void> => {
    const result = await fetch('/api/user/logout', {
      method: 'POST',
    });

    if (!result.ok) {
      const errorData = await result.json();
      throw new Error(errorData.error || 'Bir hata oluştu.');
    }
  };

  /**
   * Updates the profile of the provided user.
   */
  updateUserProfile = async (): Promise<void> => {
    try {
      if (auth.currentUser) {
        // TODO
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };
}

const userApiService = new UserApiService();
export default userApiService;
