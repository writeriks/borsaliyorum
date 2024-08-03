import firebaseGenericOperations from '@/services/firebase-service/firebase-generic-operations';

import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import {
  Role,
  SecurityRolesCollectionEnum,
} from '@/services/firebase-service/types/db-types/security-roles';
import { User, UserEnum } from '@/services/firebase-service/types/db-types/user';

export async function POST(request: Request): Promise<Response> {
  const body = await request.json();
  const userData: User = body['user'];

  const { userId } = userData;

  try {
    // Create user document
    await firebaseGenericOperations.createDocumentWithCustomId(CollectionPath.Users, userId, {
      ...userData,
      [UserEnum.CREATED_AT]: Date.now(),
      [UserEnum.USERNAME]: userData.username.toLowerCase(),
      [UserEnum.EMAIL]: userData.email.toLowerCase(),
    });

    // Create user role
    await firebaseGenericOperations.createDocumentWithCustomId(
      CollectionPath.SecurityRoles,
      userId,
      {
        [SecurityRolesCollectionEnum.USER_ID]: userId,
        [SecurityRolesCollectionEnum.ROLE]: Role.DEFAULT,
      }
    );

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
