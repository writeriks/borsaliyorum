import { auth } from '@/services/firebase-service/firebase-admin';
import firebaseGenericOperations from '@/services/firebase-service/firebase-generic-operations';
import { WhereFieldEnum } from '@/services/firebase-service/firebase-operations-types';
import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { TagsCollectionEnum } from '@/services/firebase-service/types/db-types/tag';
import { FOUR_HOURS } from '@/services/tag-service/constants';
import { NextResponse } from 'next/server';

export async function GET(request: Request): Promise<Response> {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    await auth.verifyIdToken(token);

    const pageSize = 10;

    const { documents } = await firebaseGenericOperations.getDocumentsWithQuery({
      collectionPath: CollectionPath.Tags,
      whereFields: [
        {
          field: TagsCollectionEnum.LAST_POST_DATE,
          operator: WhereFieldEnum.GREATER_THAN,
          value: Date.now() - FOUR_HOURS,
        },
      ],
      orderByField: TagsCollectionEnum.POST_COUNT_IN_LAST_FOUR_HOURS,
      orderByDirection: 'desc',
      documentLimit: pageSize,
    });

    return new NextResponse(JSON.stringify(documents), {
      status: 200,
      statusText: 'SUCCESS',
    });
  } catch (error) {
    console.error('Error in GET handler:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
