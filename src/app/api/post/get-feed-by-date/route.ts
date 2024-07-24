import { auth } from '@/services/firebase-service/firebase-admin';
import firebaseGenericOperations from '@/services/firebase-service/firebase-generic-operations';
import { WhereFieldEnum } from '@/services/firebase-service/firebase-operations-types';
import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { PostsCollectionEnum } from '@/services/firebase-service/types/db-types/post';
import { UserFollowersEnum } from '@/services/firebase-service/types/db-types/user-followers';
import { DocumentData } from '@firebase/firestore';
import { NextResponse } from 'next/server';

export async function GET(request: Request): Promise<Response> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lastPostId = searchParams.get('lastPostId');

    const pageSize = 5;

    const decodedToken = await auth.verifyIdToken(token);

    const followingUsers = await firebaseGenericOperations.getDocumentsWithQuery({
      collectionPath: CollectionPath.UsersFollowers,
      whereFields: [
        {
          field: UserFollowersEnum.FOLLOWER_ID,
          operator: WhereFieldEnum.EQUALS,
          value: decodedToken.uid,
        },
      ],
    });

    const followingUserIds = followingUsers.documents.map(doc => doc.followingId);

    if (followingUserIds.length === 0) {
      return new NextResponse(JSON.stringify([]), {
        status: 200,
        statusText: 'SUCCESS',
      });
    }

    const lastPostDocumentByDate = await firebaseGenericOperations.getDocumentsWithQuery({
      collectionPath: CollectionPath.Posts,
      whereFields: [
        {
          field: PostsCollectionEnum.POST_ID,
          operator: WhereFieldEnum.EQUALS,
          value: lastPostId,
        },
      ],
    });

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
      startAfterDocument: lastPostDocumentByDate?.lastDocument as DocumentData,
    });

    const newLastPostIdByDate = postsByDate.lastDocument?.data().postId;

    return new NextResponse(
      JSON.stringify({
        postsByDate: postsByDate.documents,
        lastPostIdByDate: newLastPostIdByDate,
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
