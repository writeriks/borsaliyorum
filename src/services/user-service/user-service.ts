import { auth } from "../firebase-service/firebase-config";
import {
  User,
  deleteUser,
  sendEmailVerification,
  updateEmail,
  updatePassword,
} from "firebase/auth";

class UserService {
  sendEmailVerification = async (user: User) => {
    try {
      const result = await sendEmailVerification(user);

      console.log(result);
    } catch (error) {
      console.error("Error sending email verification:", error);
    }
  };

  updateUserEmail = async (user: User, newEmail: string) => {
    try {
      if (auth.currentUser) {
        const result = await updateEmail(user, newEmail);

        console.log(result);
      }
    } catch (error) {
      console.error("Error updating email:", error);
    }
  };

  updateUserPassword = async (user: User, newPassword: string) => {
    try {
      if (auth.currentUser) {
        const result = await updatePassword(user, newPassword);

        console.log(result);
      }
    } catch (error) {
      console.error("Error updating password:", error);
    }
  };

  deleteUser = async (user: User) => {
    try {
      if (auth.currentUser) {
        const result = await deleteUser(user);

        console.log(result);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  // TODO: Add update profile (other user properties)
}

const userService = new UserService();
export default userService;
