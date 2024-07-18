import { User } from 'firebase/auth';

import { WhereFieldEnum } from '@/services/firebase-service/firebase-operations-types';
import { UserEnum } from '@/services/firebase-service/types/db-types/user';
import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import firebaseGenericOperations from '@/services/firebase-service/firebase-generic-operations';

class FirebaseOperations {
  /**
   * Retrieves array of user documents searched by unique user name.
   * @param username - The username of the user to retrieve.
   * @returns  The user document array, or undefined if not found.
   */
  getUsersFromFirebaseByName = async (username: string): Promise<User[] | undefined> => {
    try {
      const endUsername = username + '\uf8ff';
      const { documents } = await firebaseGenericOperations.getDocumentsWithQuery({
        collectionPath: CollectionPath.Users,
        whereFields: [
          {
            field: UserEnum.USERNAME,
            operator: WhereFieldEnum.GREATER_THAN_OR_EQUAL,
            value: username,
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
}

const firebaseOperations = new FirebaseOperations();
export default firebaseOperations;
