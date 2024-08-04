import { NextRequest } from 'next/server';

import { auth } from '@/services/firebase-service/firebase-admin';
import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { WhereFieldEnum } from '@/services/firebase-service/firebase-operations-types';
import firebaseGenericOperations from '@/services/firebase-service/firebase-generic-operations';
import { CommentsCollectionEnum } from '@/services/firebase-service/types/db-types/comment';
import { createResponse, ResponseStatus } from '@/app/api/api-utils/api-utils';

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    const userId = searchParams.get('userId');

    if (!commentId || !userId) {
      return createResponse(ResponseStatus.BAD_REQUEST);
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    const idToken = await auth.verifyIdToken(token);

    if (idToken.uid !== userId) {
      return createResponse(ResponseStatus.UNAUTHORIZED);
    }

    const { lastDocument } = await firebaseGenericOperations.getDocumentsWithQuery({
      collectionPath: CollectionPath.Comments,
      whereFields: [
        {
          field: CommentsCollectionEnum.COMMENT_ID,
          operator: WhereFieldEnum.EQUALS,
          value: commentId,
        },
      ],
    });

    const deletedCommentId = lastDocument?.data().commentId ?? '';

    if (deletedCommentId) {
      await firebaseGenericOperations.deleteDocumentById(CollectionPath.Comments, deletedCommentId);
      return createResponse(ResponseStatus.OK, { deletedCommentId });
    } else {
      return createResponse(ResponseStatus.NOT_FOUND);
    }
  } catch (error: any) {
    console.error('Error deleting comment:', error.message);
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
