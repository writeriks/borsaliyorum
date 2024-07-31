import { MAX_CHARACTERS } from '@/services/api-service/post-api-service/constants';
import { auth, storageBucket } from '@/services/firebase-service/firebase-admin';
import firebaseGenericOperations from '@/services/firebase-service/firebase-generic-operations';

import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { Post } from '@/services/firebase-service/types/db-types/post';
import tagService from '@/services/tag-service/tag-service';
import { randomUUID } from 'crypto';
import { Timestamp } from 'firebase/firestore';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const imageData: string = body['imageData'];
    const post: Post = body['post'];

    if (post.content.length > MAX_CHARACTERS) {
      return new Response(null, { status: 400, statusText: 'Too many characters' });
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    await auth.verifyIdToken(token);

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

      post.media.src = downloadUrl[0];
    }

    post.createdAt = Timestamp.now();
    post.commentCount = 0;
    post.likeCount = 0;
    post.repostCount = 0;
    post.postId = randomUUID() + Date.now();
    await firebaseGenericOperations.createDocumentWithAutoId(CollectionPath.Posts, post);

    await tagService.createTag(post.content);

    // TODO : Handle Mentions

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
