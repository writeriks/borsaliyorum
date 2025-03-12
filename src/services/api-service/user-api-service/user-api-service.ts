import {
  EmailAuthProvider,
  User as FirebaseUser,
  deleteUser,
  reauthenticateWithCredential,
  sendEmailVerification,
  updateEmail,
  updatePassword,
} from 'firebase/auth';

import { auth } from '../../firebase-service/firebase-config';

import store from '@/store/redux-store';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { User } from '@prisma/client';
import { apiFetchProxy } from '@/services/api-service/fetch-proxy';
import { NotificationResponse } from '@/components/user-notifications/user-notifications-schema';

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
   * @param newEmail - The new email address to set.
   * @param oldEmail - The old email address to set.
   * @param currentPassword - The current password to set.
   */
  updateUserEmail = async (
    newEmail: string,
    oldEmail: string,
    currentPassword: string
  ): Promise<void> => {
    try {
      if (auth.currentUser) {
        const credential = EmailAuthProvider.credential(oldEmail, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updateEmail(auth.currentUser, newEmail);
        await this.updateUserProfile({
          email: newEmail,
        });
        await sendEmailVerification(auth.currentUser);
      }
    } catch (error) {
      console.error('Error updating email:', error);
      throw new Error('Eposta güncellenirken hata oluştu.');
    }
  };

  /**
   * Updates the username of the user.
   * @param username - The new username to set.
   */
  updateUsername = async (username: string): Promise<void> => {
    try {
      if (auth.currentUser) {
        await this.updateUserProfile({
          username: username,
        });
      }
    } catch (error: any) {
      console.error('Error updating username:', error);
      throw new Error(error.message || 'Kullanıcı adı güncellenirken hata oluştu.');
    }
  };

  /**
   * Updates the password of the provided Firebase user.
   * @param currentPassword - The current password to reauthenticate.
   * @param newPassword - The new password to set.
   * @param email - The current email address to reauthenticate.
   */
  updateUserPassword = async (
    currentPassword: string,
    newPassword: string,
    email: string
  ): Promise<void> => {
    try {
      if (auth.currentUser) {
        const credential = EmailAuthProvider.credential(email, currentPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        await updatePassword(auth.currentUser, newPassword);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      throw new Error('Şifre güncellenirken hata oluştu.');
    }
  };

  /**
   * Deletes the provided Firebase user.
   * @param user - The Firebase user to delete.
   */
  deleteUser = async (): Promise<void> => {
    try {
      if (auth.currentUser) {
        // delete user from db
        await apiFetchProxy('user/delete-user', 'DELETE');

        // delete user from firebase
        await deleteUser(auth.currentUser);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error('Kullanıcı silinirken hata oluştu.');
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
  updateUserProfile = async ({
    displayName,
    username,
    bio,
    location,
    birthday,
    website,
    profilePhoto,
    email,
  }: {
    displayName?: string;
    username?: string;
    bio?: string;
    location?: string;
    birthday?: string;
    website?: string;
    profilePhoto?: File;
    email?: string;
  }): Promise<boolean> => {
    if (auth.currentUser) {
      const requestBody = {
        user: {
          displayName,
          username,
          bio,
          location,
          birthday,
          website,
          profilePhoto,
          email,
        },
      };

      const response = await apiFetchProxy('user/edit-user', 'POST', JSON.stringify(requestBody));

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Bir hata oluştu.');
      }
    }

    return false;
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

  /**
   * Fetches user notifications.
   * @param lastNotificationId - The last notification ID.
   * @returns The user notifications.
   */
  getUserNotifications = async (
    lastNotificationId: string | number
  ): Promise<NotificationResponse> => {
    const response = await apiFetchProxy(
      `notifications/get-notifications?lastNotificationId=${lastNotificationId}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  /**
   * Reads all user notifications.
   * @returns The user notifications.
   */
  readAllUserNotifications = async (): Promise<NotificationResponse> => {
    const response = await apiFetchProxy(`notifications/read-all-notifications`, 'POST');

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  /**
   * Fetches total notification count for the user.
   * @returns The total notification count.
   */
  getUserNotificationCount = async (): Promise<{ total: number }> => {
    const response = await apiFetchProxy('notifications/get-notification-count');

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  /**
   * Fetches user followers with pagination.
   * @param userId - The ID of the user whose followers to fetch.
   * @param page - The page number for pagination.
   * @param limit - The number of followers per page.
   * @returns The user followers with pagination info.
   */
  getUserFollowers = async (
    userId: number,
    page = 1,
    limit = 10
  ): Promise<{
    followers: Array<{
      userId: number;
      username: string;
      displayName: string;
      profilePhoto: string | null;
      bio: string | null;
      isFollowing: boolean;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> => {
    try {
      const response = await apiFetchProxy(
        `user/get-user-followers?userId=${userId}&page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Takipçiler yüklenirken bir hata oluştu.');
      }

      return response.json();
    } catch (error: any) {
      console.error('Error fetching followers:', error);
      throw new Error(error.message || 'Takipçiler yüklenirken bir hata oluştu.');
    }
  };

  /**
   * Fetches users that a user is following with pagination.
   * @param userId - The ID of the user whose followings to fetch.
   * @param page - The page number for pagination.
   * @param limit - The number of followings per page.
   * @returns The user followings with pagination info.
   */
  getUserFollowings = async (
    userId: number,
    page = 1,
    limit = 10
  ): Promise<{
    followings: Array<{
      userId: number;
      username: string;
      displayName: string;
      profilePhoto: string | null;
      bio: string | null;
      isFollowing: boolean;
    }>;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> => {
    try {
      const response = await apiFetchProxy(
        `user/get-user-followings?userId=${userId}&page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Takip edilenler yüklenirken bir hata oluştu.');
      }

      return response.json();
    } catch (error: any) {
      console.error('Error fetching followings:', error);
      throw new Error(error.message || 'Takip edilenler yüklenirken bir hata oluştu.');
    }
  };
}

const userApiService = new UserApiService();
export default userApiService;
