import { auth } from '@/services/firebase-service/firebase-config';
import { User } from '@prisma/client';

import { DocumentData } from 'firebase/firestore';

class CommentApiService {
  createNewComment = async (
    comment: { postId: number; content: string },
    imageData: string
  ): Promise<any> => {
    const requestBody = {
      comment,
      imageData,
    };
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch('/api/comment/create-comment', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(response.statusText);

    return response.json();
  };

  getCommentsByPostId = async (
    postId: number,
    lastCommentId: string
  ): Promise<{
    comments: DocumentData[];
    lastCommentId: string;
  }> => {
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch(
      `/api/comment/get-comments-by-post-id?postId=${encodeURIComponent(postId)}&lastCommentId=${encodeURIComponent(lastCommentId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  getCommentOwnerById = async (userId: number): Promise<User> => {
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch(
      `/api/comment/get-comment-owner?userId=${encodeURIComponent(userId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) throw new Error(response.statusText);

    return response.json();
  };

  deleteComment = async (
    commentId: string,
    userId: string
  ): Promise<{ deletedCommentId: string }> => {
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch(
      `/api/comment/delete-comment?commentId=${encodeURIComponent(commentId)}&userId=${encodeURIComponent(userId)}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };
}

const commentApiService = new CommentApiService();
export default commentApiService;
