import { createResponse, ResponseStatus } from '@/app/api/api-utils/api-utils';
import { MAX_CHARACTERS } from '@/services/api-service/post-api-service/constants';
import { auth, storageBucket } from '@/services/firebase-service/firebase-admin';
import firebaseGenericOperations from '@/services/firebase-service/firebase-generic-operations';

import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { Comment } from '@/services/firebase-service/types/db-types/comment';
import tagService from '@/services/tag-service/tag-service';

import { randomUUID } from 'crypto';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const imageData: string = body['imageData'];
    const comment: Comment = body['comment'];

    if (comment.content.length > MAX_CHARACTERS) {
      return new Response(null, { status: 400, statusText: 'Too many characters' });
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const idToken = await auth.verifyIdToken(token);

    if (imageData) {
      // Image Upload Workflow
      const base64Data = imageData.split(',')[1];
      const fileName = `${randomUUID()}_${Date.now()}.jpg`;

      const file = storageBucket.file(`images/${fileName}`);

      await file.save(Buffer.from(base64Data, 'base64'), {
        contentType: 'image/jpeg',
        metadata: {
          metadata: {
            firebaseStorageDownloadTokens: randomUUID(),
          },
        },
      });

      // Get the download URL for the uploaded image
      const downloadUrl = await file.getSignedUrl({
        action: 'read',
        expires: '01-01-2100',
      });

      comment.media.src = downloadUrl[0];
    }

    comment.createdAt = Date.now();
    comment.likeCount = 0;
    comment.commentId = randomUUID() + Date.now();
    comment.userId = idToken.uid;
    await firebaseGenericOperations.createDocumentWithAutoId(CollectionPath.Comments, comment);

    await tagService.createTag(comment.content);

    return createResponse(ResponseStatus.OK, comment);
  } catch (error) {
    return createResponse(ResponseStatus.INTERNAL_SERVER_ERROR);
  }
}
