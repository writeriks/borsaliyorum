import { NextRequest } from 'next/server';

import { auth } from '@/services/firebase-service/firebase-admin';
import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { PostsCollectionEnum } from '@/services/firebase-service/types/db-types/post';
import { WhereFieldEnum } from '@/services/firebase-service/firebase-operations-types';
import firebaseGenericOperations from '@/services/firebase-service/firebase-generic-operations';
import { CommentsCollectionEnum } from '@/services/firebase-service/types/db-types/comment';
import { DocumentData } from 'firebase/firestore';
import { createResponse, ResponseStatus } from '@/app/api/api-utils/api-utils';

export async function GET(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const lastCommentId = searchParams.get('lastCommentId');
    const pageSize = 10;

    if (!postId) {
      return createResponse(ResponseStatus.BAD_REQUEST);
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    await auth.verifyIdToken(token);

    const { lastDocument } = await firebaseGenericOperations.getDocumentsWithQuery({
      collectionPath: CollectionPath.Comments,
      whereFields: [
        {
          field: CommentsCollectionEnum.COMMENT_ID,
          operator: WhereFieldEnum.EQUALS,
          value: lastCommentId,
        },
      ],
    });

    const { lastDocument: lastDocumentOfList, documents } =
      await firebaseGenericOperations.getDocumentsWithQuery({
        collectionPath: CollectionPath.Comments,
        whereFields: [
          {
            field: CommentsCollectionEnum.POST_ID,
            operator: WhereFieldEnum.EQUALS,
            value: postId,
          },
        ],
        documentLimit: pageSize,
        orderByField: PostsCollectionEnum.CREATED_AT,
        orderByDirection: 'desc',
        startAfterDocument: lastDocument as DocumentData,
      });

    const newLastCommentId = lastDocumentOfList?.data().commentId;

    return createResponse(ResponseStatus.OK, {
      comments: documents,
      lastCommentId: newLastCommentId,
    });
  } catch (error: any) {
    console.error('Error fetching comment:', error.message);
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
