import { auth } from '@/services/firebase-service/firebase-config';
import { Comment } from '@/services/firebase-service/types/db-types/comments';
import { Post } from '@/services/firebase-service/types/db-types/post';
import { DocumentData } from 'firebase/firestore';

class PostApiService {
  createNewPost = async (post: Post, imageData: string): Promise<any> => {
    const requestBody = {
      post,
      imageData,
    };
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch('/api/post/create-post', {
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

  createNewComment = async (comment: Comment, imageData: string): Promise<any> => {
    const requestBody = {
      comment,
      imageData,
    };
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch('/api/post/create-comment', {
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

  getFeedByDate = async (
    lastPostId: string
  ): Promise<{
    postsByDate: DocumentData[];
    lastPostId: string;
  }> => {
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch(
      `/api/post/get-feed-by-date?lastPostId=${encodeURIComponent(lastPostId)}`,
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

  getFeedByLike = async (
    lastPostId: string
  ): Promise<{
    postsByDate: DocumentData[];
    lastPostId: string;
  }> => {
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch(
      `/api/post/get-feed-by-like?lastPostId=${encodeURIComponent(lastPostId)}`,
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

  getPostById = async (postId: string): Promise<Post> => {
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch(`/api/post/get-post-by-id?postId=${encodeURIComponent(postId)}`, {
      method: 'GET',
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
      `/api/post/get-comments-by-post-id?postId=${encodeURIComponent(postId)}&lastCommentId=${encodeURIComponent(lastCommentId)}`,
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
}

const postApiService = new PostApiService();
export default postApiService;
