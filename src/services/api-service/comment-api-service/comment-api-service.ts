import { auth } from '@/services/firebase-service/firebase-config';
import { Comment } from '@prisma/client';

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
    comments: Comment[];
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
    commentId: number,
    userId: number
  ): Promise<{ deletedCommentId: number }> => {
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

  toggleCommentLike = async (commentId: number): Promise<any> => {
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch('/api/comment/like-comment', {
      method: 'POST',
      body: JSON.stringify({ commentId }),
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };
}

const commentApiService = new CommentApiService();
export default commentApiService;
