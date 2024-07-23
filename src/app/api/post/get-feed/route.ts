import { auth } from '@/services/firebase-service/firebase-admin';
import firebaseGenericOperations from '@/services/firebase-service/firebase-generic-operations';
import { WhereFieldEnum } from '@/services/firebase-service/firebase-operations-types';
import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { PostsCollectionEnum } from '@/services/firebase-service/types/db-types/post';
import { UserFollowersEnum } from '@/services/firebase-service/types/db-types/user-followers';
import { DocumentData } from '@firebase/firestore';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<Response> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const pageSize = 5;

    const decodedToken = await auth.verifyIdToken(token);

    const body = await request.json();

    const lastDocumentDate = body['lastDocumentDate'] as DocumentData;
    const lastDocumentLike = body['lastDocumentLike'] as DocumentData;

    const followedUsers = await firebaseGenericOperations.getDocumentsWithQuery({
      collectionPath: CollectionPath.UsersFollowers,
      whereFields: [
        {
          field: UserFollowersEnum.FOLLOWER_ID,
          operator: WhereFieldEnum.EQUALS,
          value: decodedToken.uid,
        },
      ],
    });

    const followingUserIds = followedUsers.documents.map(doc => doc.followedId);

    if (followingUserIds.length === 0) {
      return new NextResponse(JSON.stringify([]), {
        status: 200,
        statusText: 'SUCCESS',
      });
    }

    const postsByDate = await firebaseGenericOperations.getDocumentsWithQuery({
      collectionPath: CollectionPath.Posts,
      whereFields: [
        {
          field: PostsCollectionEnum.USER_ID,
          operator: WhereFieldEnum.IN,
          value: followingUserIds,
        },
      ],
      documentLimit: pageSize,
      orderByField: PostsCollectionEnum.CREATED_AT,
      orderByDirection: 'desc',
      startAfterDocument: lastDocumentDate,
    });

    const postsByLikes = await firebaseGenericOperations.getDocumentsWithQuery({
      collectionPath: CollectionPath.Posts,
      whereFields: [
        {
          field: PostsCollectionEnum.USER_ID,
          operator: WhereFieldEnum.IN,
          value: followingUserIds,
        },
      ],
      documentLimit: pageSize,
      orderByField: PostsCollectionEnum.LIKE_COUNT,
      orderByDirection: 'desc',
      startAfterDocument: lastDocumentLike,
    });

    return new NextResponse(
      JSON.stringify({
        postsByDate: postsByDate.documents,
        postsByLikes: postsByLikes.documents,
        lastDocumentByDate: postsByDate.lastDocument,
        lastDocumentByLike: postsByLikes.lastDocument,
      }),
      {
        status: 200,
        statusText: 'SUCCESS',
      }
    );
  } catch (error) {
    console.error('Error in GET handler:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
