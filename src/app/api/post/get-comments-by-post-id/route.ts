import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/services/firebase-service/firebase-admin';
import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { PostsCollectionEnum } from '@/services/firebase-service/types/db-types/post';
import { WhereFieldEnum } from '@/services/firebase-service/firebase-operations-types';
import firebaseGenericOperations from '@/services/firebase-service/firebase-generic-operations';
import { CommentsCollectionEnum } from '@/services/firebase-service/types/db-types/comments';
import { DocumentData } from 'firebase/firestore';

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');
  const lastCommentId = searchParams.get('lastCommentId');
  const pageSize = 5;

  if (!postId) {
    return NextResponse.json({ error: 'error on getting post' }, { status: 400 });
  }

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  await auth.verifyIdToken(token);

  try {
    const lastCommentDocument = await firebaseGenericOperations.getDocumentsWithQuery({
      collectionPath: CollectionPath.Comments,
      whereFields: [
        {
          field: CommentsCollectionEnum.COMMENT_ID,
          operator: WhereFieldEnum.EQUALS,
          value: lastCommentId,
        },
      ],
    });

    const comments = await firebaseGenericOperations.getDocumentsWithQuery({
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
      startAfterDocument: lastCommentDocument?.lastDocument as DocumentData,
    });

    const newLastCommentId = comments.lastDocument?.data().commentId;

    return new NextResponse(
      JSON.stringify({
        comments: comments.documents,
        lastCommentId: newLastCommentId,
      }),
      {
        status: 200,
        statusText: 'SUCCESS',
      }
    );
  } catch (error: any) {
    console.error('Error fetching comment:', error.message);
    return new NextResponse(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
