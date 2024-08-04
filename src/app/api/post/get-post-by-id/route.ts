import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/services/firebase-service/firebase-admin';
import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { PostsCollectionEnum } from '@/services/firebase-service/types/db-types/post';
import { WhereFieldEnum } from '@/services/firebase-service/firebase-operations-types';
import firebaseGenericOperations from '@/services/firebase-service/firebase-generic-operations';

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'error on getting post' }, { status: 400 });
  }

  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  await auth.verifyIdToken(token);

  try {
    const response = await firebaseGenericOperations.getDocumentsWithQuery({
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

    const post = response.documents[0];

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return new NextResponse(JSON.stringify(post), {
      status: 200,
      statusText: 'SUCCESS',
    });
  } catch (error: any) {
    console.error('Error fetching post:', error.message);
    return new NextResponse(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
