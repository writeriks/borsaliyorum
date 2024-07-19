import { auth, storageBucket } from '@/services/firebase-service/firebase-admin';
import firebaseGenericOperations from '@/services/firebase-service/firebase-generic-operations';

import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { MediaData, Post } from '@/services/firebase-service/types/db-types/post';
import { randomUUID } from 'crypto';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const imageData: string = body['imageData'];
    const post: Post = body['post'];
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await auth.verifyIdToken(token);

    if (imageData) {
      // Image Upload Workflow
      const base64Data = imageData.split(',')[1];
      const media: MediaData = { src: '', alt: `${post.media.alt}` };
      const fileName = `${randomUUID()}_${media.alt}.jpg`;

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

      post.media.src = downloadUrl[0];
    }

    await firebaseGenericOperations.createDocumentWithAutoId(CollectionPath.Posts, post);

    return new Response(JSON.stringify({ message: 'Post created successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in POST handler:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
