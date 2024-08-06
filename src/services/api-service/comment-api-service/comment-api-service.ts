import { auth } from '@/services/firebase-service/firebase-config';
import { Comment } from '@/services/firebase-service/types/db-types/comment';
import { DocumentData } from 'firebase/firestore';

class CommentApiService {
  createNewComment = async (comment: Comment, imageData: string): Promise<any> => {
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
    postId: string,
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
