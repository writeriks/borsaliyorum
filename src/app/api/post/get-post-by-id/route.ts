import { NextRequest, NextResponse } from 'next/server';

import firebaseOperations from '@/services/firebase-service/firebase-operations';
import { auth } from '@/services/firebase-service/firebase-admin';
import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { Post, PostsCollectionEnum } from '@/services/firebase-service/types/db-types/post';
import { WhereFieldEnum } from '@/services/firebase-service/firebase-operations-types';

/* Buffer to return image to client */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');

  console.log(postId);

  if (!postId) {
    return NextResponse.json({ error: 'error on getting post' }, { status: 400 });
  }

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  await auth.verifyIdToken(token);

  try {
    const response = await firebaseOperations.getDocumentsWithQuery({
      collectionPath: CollectionPath.Posts,
      whereFields: [
        {
          field: PostsCollectionEnum.POST_ID,
          operator: WhereFieldEnum.EQUALS,
          value: postId,
        },
      ],
      documentLimit: 1,
    });

    console.log(response.documents[0]);

    const post = response.documents[0];

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return new NextResponse(JSON.stringify(post), {
      status: 200,
      statusText: 'SUCCESS',
    });
  } catch (error: any) {
    console.error('Error fetching user:', error.message);
    return new NextResponse(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
