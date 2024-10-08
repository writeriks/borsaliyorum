import { auth } from '@/services/firebase-service/firebase-config';
import { Post, Sentiment } from '@prisma/client';

class PostApiService {
  /**
   * Creates a new post with the given content, sentiment, and image data.
   *
   * @param post - An object containing the content and sentiment of the post.
   * @param imageData - A base64 encoded string representing the image data for the post.
   * @returns A promise that resolves to the created post data.
   */
  createNewPost = async (
    post: { content: string; sentiment: Sentiment },
    imageData: string
  ): Promise<any> => {
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  /**
   * Fetches the user's feed sorted by date.
   *
   * @param lastPostId - The ID of the last post retrieved for pagination purposes.
   * @returns A promise that resolves to an object containing the posts sorted by date and the last post ID.
   */
  getFeedByDate = async (
    lastPostId: string
  ): Promise<{
    postsByDate: Post[];
    lastPostIdByDate: string;
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  /**
   * Fetches the user's feed sorted by like count.
   *
   * @param lastPostId - The ID of the last post retrieved for pagination purposes.
   * @returns A promise that resolves to an object containing the posts sorted by like count and the last post ID.
   */
  getFeedByLike = async (
    lastPostId: string
  ): Promise<{
    postsByLike: Post[];
    lastPostIdByLike: string;
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  /**
   * Fetches a post by its ID.
   *
   * @param postId - The ID of the post to retrieve.
   * @returns A promise that resolves to the post data.
   */
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

  /**
   * Toggles the like status of a post.
   *
   * @param postId - The ID of the post to like or unlike.
   * @returns A promise that resolves to the updated like status.
   */
  togglePostLike = async (postId: number): Promise<any> => {
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch('/api/post/like-post', {
      method: 'POST',
      body: JSON.stringify({ postId }),
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

  /**
   * Toggles the repost status of a post.
   *
   * @param postId - The ID of the post to repost or un-repost.
   * @returns A promise that resolves to the updated repost status.
   */
  toggleRepost = async (postId: number): Promise<any> => {
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch('/api/post/repost', {
      method: 'POST',
      body: JSON.stringify({ postId }),
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

const postApiService = new PostApiService();
export default postApiService;
