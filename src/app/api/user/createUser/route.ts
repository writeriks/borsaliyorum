import firebaseOperations from '@/services/firebase-service/firebase-operations';
import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import {
  Role,
  SecurityRolesCollectionEnum,
} from '@/services/firebase-service/types/db-types/security-roles';
import { User, UserEnum } from '@/services/firebase-service/types/db-types/user';
import { Timestamp } from 'firebase/firestore';

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const userData: User = body['user'];

  const { userId } = userData;

  try {
    // Create user document
    await firebaseOperations.createDocumentWithCustomId(CollectionPath.Users, userId, {
      ...userData,
      [UserEnum.CREATED_AT]: Timestamp.now(),
      [UserEnum.USERNAME]: userData.username.toLowerCase(),
      [UserEnum.EMAIL]: userData.email.toLowerCase(),
    });

    // Create user role
    await firebaseOperations.createDocumentWithCustomId(CollectionPath.SecurityRoles, userId, {
      [SecurityRolesCollectionEnum.USER_ID]: userId,
      [SecurityRolesCollectionEnum.ROLE]: Role.DEFAULT,
    });

    return new Response(null, {
      status: 200,
      statusText: 'SUCCESS',
    });
  } catch (error) {
    return new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
