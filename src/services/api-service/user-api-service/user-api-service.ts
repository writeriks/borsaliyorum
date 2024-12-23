import { User as FirebaseUser, deleteUser, updateEmail, updatePassword } from 'firebase/auth';

import { auth } from '../../firebase-service/firebase-config';

import store from '@/store/redux-store';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { User } from '@prisma/client';
import { apiFetchProxy } from '@/services/api-service/fetch-proxy';

class UserApiService {
  /**
   * Retrieves a user by user ID.
   * @param userId - The ID of the user to retrieve.
   * @returns  The user, or undefined if not found.
   */
  getUserById = async (userId: string): Promise<User | undefined> => {
    try {
      const response = await apiFetchProxy(
        `user/get-user-by-id?userId=${encodeURIComponent(userId)}`
      );

      const user = await response.json();

      return user ? user : undefined;
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  /**
   * Retrieves entry (post or comment) owner by user ID.
   * @param userId - The ID of the user to retrieve.
   * @returns  The user, or undefined if not found.
   */
  getEntryOwner = async (
    userId: number
  ): Promise<(User & { isUserFollowed: boolean }) | undefined> => {
    try {
      const response = await apiFetchProxy(
        `user/get-entry-owner?userId=${encodeURIComponent(userId)}`
      );

      const user = await response.json();

      return user ? user : undefined;
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  /**
   * Sends a request to public api to fetch users searched by username.
   * @param username - The username of the user to retrieve.
   * @returns  The user array, or undefined if not found.
   */
  getUsersByUserName = async (username: string): Promise<User[] | undefined> => {
    try {
      const response = await apiFetchProxy(
        `user/get-user-by-username?username=${encodeURIComponent(username)}`
      );

      return response.json();
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
   * Syncs the firebase user with the user in db.
   * @param firebaseUser - The Firebase user to sync.
   * @param user - The user to update.
   */
  syncGmailLogin = async (firebaseUser: FirebaseUser, user: User): Promise<void> => {
    try {
      if (auth.currentUser) {
        if (firebaseUser.emailVerified !== user.isEmailVerified) {
          const updatedUser: User = {
            ...user,
            profilePhoto: user.profilePhoto ? user.profilePhoto : firebaseUser.photoURL ?? null,
            isEmailVerified: firebaseUser.emailVerified,
            displayName: user.displayName ?? firebaseUser.displayName,
          };

          const response = await apiFetchProxy(
            'user/sync-gmail-login',
            'POST',
            JSON.stringify({ user: updatedUser })
          );

          return response.json();
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
   * Adds a new user to the database.
   * @param customUser - The user to add.
   */
  addUser = async (customUser: Partial<User>): Promise<void> => {
    const requestBody = {
      user: customUser,
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
      const error = await result.json();
      throw new Error(error.message || 'Bir hata oluştu.');
    }
  };

  /**
   * Validates the provided Firebase user and assigns a session cookie.
   * @param user - The Firebase user to validate.
   */
  validateUser = async (user: FirebaseUser): Promise<boolean> => {
    const token = await user.getIdToken();

    const result = await fetch('/api/user/validate-user', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return result.ok;
  };

  /**
   * Logs out the current user.
   */
  logOutUser = async (): Promise<void> => {
    const result = await fetch('/api/user/logout', {
      method: 'POST',
    });

    if (!result.ok) {
      const error = await result.json();
      throw new Error(error.message || 'Bir hata oluştu.');
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

  /**
   * Follows a user.
   * @param userId - The ID of the user to follow.
   * @returns The response from the follow operation.
   */
  followUser = async (userId: number): Promise<boolean> => {
    const response = await apiFetchProxy(`user/follow-user`, 'POST', JSON.stringify({ userId }));

    return response.ok;
  };

  /**
   * Unfollows a user.
   * @param userId - The ID of the user to unfollow.
   * @returns The response from the unfollow operation.
   */
  unfollowUser = async (userId: number): Promise<boolean> => {
    const response = await apiFetchProxy(`user/unfollow-user`, 'POST', JSON.stringify({ userId }));

    return response.ok;
  };

  /**
   * Blocks a user.
   * @param userId - The ID of the user to block.
   * @returns The response from the block operation.
   */
  blockUser = async (userId: number): Promise<void> => {
    const response = await apiFetchProxy(`user/block-user`, 'POST', JSON.stringify({ userId }));

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  /**
   * Blocks a user.
   * @param userId - The ID of the user to block.
   * @returns The response from the block operation.
   */
  unblockUser = async (userId: number): Promise<void> => {
    const response = await apiFetchProxy(`user/unblock-user`, 'POST', JSON.stringify({ userId }));

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };
}

const userApiService = new UserApiService();
export default userApiService;
