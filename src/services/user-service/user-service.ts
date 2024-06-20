import firebaseOperations from "@/services/firebase-service/firebase-operations";
import { auth } from "../firebase-service/firebase-config";
import {
  User as FirebaseUser,
  deleteUser,
  sendEmailVerification,
  updateEmail,
  updatePassword,
} from "firebase/auth";
import { CollectionPath } from "@/services/firebase-service/types/collection-types";
import {
  User,
  UserEnum,
} from "@/services/firebase-service/types/db-types/user";
import { Timestamp } from "firebase/firestore";

class UserService {
  /**
   * Sends an email verification to the provided Firebase user.
   * @param user - The Firebase user to send the email verification to.
   */
  sendEmailVerification = async (user: FirebaseUser): Promise<void> => {
    try {
      const result = await sendEmailVerification(user);

      console.log(result);
    } catch (error) {
      console.error("Error sending email verification:", error);
    }
  };

  /**
   * Retrieves a user document by user ID.
   * @param userId - The ID of the user to retrieve.
   * @returns  The user document, or undefined if not found.
   */
  getUserById = async (userId: string): Promise<User | undefined> => {
    try {
      const userDoc = await firebaseOperations.getDocumentById(
        CollectionPath.Users,
        userId
      );

      return userDoc?.exists() ? (userDoc.data() as User) : undefined;
    } catch (error) {
      console.error("Error getting user:", error);
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
          await firebaseOperations.updateDocumentById(
            CollectionPath.Users,
            userDocument.userId,
            {
              ...userDocument,
              [UserEnum.IS_EMAIL_VERIFIED]: user.emailVerified,
              [UserEnum.EMAIL]: user.email,
              [UserEnum.UPDATED_AT]: Timestamp.now(),
            }
          );
        }
      }
    } catch (error) {
      console.error("Error updating email:", error);
    }
  };

  /**
   * Updates the email address of the provided Firebase user.
   * @param user - The Firebase user to update.
   * @param newEmail - The new email address to set.
   */
  updateUserEmail = async (
    user: FirebaseUser,
    newEmail: string
  ): Promise<void> => {
    try {
      if (auth.currentUser) {
        const result = await updateEmail(user, newEmail);

        console.log(result);
      }
    } catch (error) {
      console.error("Error updating email:", error);
    }
  };

  /**
   * Updates the password of the provided Firebase user.
   * @param user - The Firebase user to update.
   * @param newPassword - The new password to set.
   */
  updateUserPassword = async (
    user: FirebaseUser,
    newPassword: string
  ): Promise<void> => {
    try {
      if (auth.currentUser) {
        const result = await updatePassword(user, newPassword);

        console.log(result);
      }
    } catch (error) {
      console.error("Error updating password:", error);
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
      console.error("Error deleting user:", error);
    }
  };

  /**
   * Adds a new user document to Firestore.
   * @param user - The user document to add.
   */
  addUser = async (user: User): Promise<void> => {
    try {
      const result = await firebaseOperations.createDocumentWithCustomId(
        CollectionPath.Users,
        user.userId,
        user
      );
      console.log(result);
    } catch (error) {
      console.error("Error adding user:", error);
    }
  };

  /**
   * Updates the profile of the provided user.
   * @param user - The user to update.
   */
  updateUserProfile = async (user: User): Promise<void> => {
    try {
      if (auth.currentUser) {
        // TODO
      }
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };
}

const userService = new UserService();
export default userService;
