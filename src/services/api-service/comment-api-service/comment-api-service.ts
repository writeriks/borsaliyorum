import { apiFetchProxy } from '@/services/api-service/fetch-proxy';
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

    const response = await apiFetchProxy(
      `comment/create-comment`,
      'POST',
      JSON.stringify(requestBody)
    );

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
    const response = await apiFetchProxy(
      `comment/get-comments-by-post-id?postId=${encodeURIComponent(postId)}&lastCommentId=${encodeURIComponent(lastCommentId)}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  deleteComment = async (commentId: number): Promise<{ deletedCommentId: number }> => {
    const response = await apiFetchProxy(
      `comment/delete-comment?commentId=${encodeURIComponent(commentId)}`,
      'DELETE'
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  toggleCommentLike = async (commentId: number): Promise<any> => {
    const response = await apiFetchProxy(
      `comment/like-comment`,
      'POST',
      JSON.stringify({ commentId })
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
