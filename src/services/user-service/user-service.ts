import firebaseOperations from '@/services/firebase-service/firebase-operations';
import { auth } from '../firebase-service/firebase-config';
import {
  User as FirebaseUser,
  deleteUser,
  sendEmailVerification,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { User, UserEnum } from '@/services/firebase-service/types/db-types/user';
import { Timestamp } from 'firebase/firestore';
import { WhereFieldEnum } from '@/services/firebase-service/firebase-operations-types';

class UserService {
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
   * Retrieves array of user documents searched by unique user name.
   * @param userName - The username of the user to retrieve.
   * @returns  The user document array, or undefined if not found.
   */
  getUsersByName = async (userName: string): Promise<User[] | undefined> => {
    try {
      const endUsername = userName + '\uf8ff';
      const { documents } = await firebaseOperations.getDocumentsWithQuery({
        collectionPath: CollectionPath.Users,
        whereFields: [
          {
            field: UserEnum.USERNAME,
            operator: WhereFieldEnum.GREATER_THAN_OR_EQUAL,
            value: userName,
          },
          {
            field: UserEnum.USERNAME,
            operator: WhereFieldEnum.LESS_THAN_OR_EQUAL,
            value: endUsername,
          },
        ],
      });

      return documents as User[];
    } catch (error) {
      console.error('Error getting user:', error);
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
        const result = await updateEmail(user, newEmail);

        console.log(result);
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
        const result = await updatePassword(user, newPassword);

        console.log(result);
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
        const result = await deleteUser(user);

        console.log(result);
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
    const result = await fetch('/api/user/createUser', {
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
    const result = await fetch('/api/user/checkIfUserExist', {
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
    const requestBody = { token };

    const result = await fetch('/api/user/validateUser', {
      method: 'POST',
      body: JSON.stringify(requestBody),
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

const userService = new UserService();
export default userService;
