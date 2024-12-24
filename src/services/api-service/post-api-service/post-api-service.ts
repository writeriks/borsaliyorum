import { apiFetchProxy } from '@/services/api-service/fetch-proxy';
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

    const response = await apiFetchProxy('post/create-post', 'POST', JSON.stringify(requestBody));

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
    const response = await apiFetchProxy(
      `post/get-feed-by-date?lastPostId=${encodeURIComponent(lastPostId)}`
    );

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
   * @param username - The ID of the user to retrieve the feed for.
   * @returns A promise that resolves to an object containing the posts sorted by date and the last post ID.
   */
  getUserPostsByDate = async (
    lastPostId: string,
    username: string
  ): Promise<{
    postsByDate: Post[];
    lastPostIdByDate: string;
  }> => {
    const response = await apiFetchProxy(
      `user/get-user-posts-by-date?username=${encodeURIComponent(username)}&lastPostId=${encodeURIComponent(lastPostId)}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  /**
   * Fetches the stock feed sorted by date.
   *
   * @param lastPostId - The ID of the last post retrieved for pagination purposes.
   * @param ticker - The ticker symbol of the stock.
   * @returns A promise that resolves to an object containing the posts sorted by date and the last post ID.
   */
  getStockFeedByDate = async (
    lastPostId: string,
    ticker: string
  ): Promise<{
    postsByDate: Post[];
    lastPostIdByDate: string;
  }> => {
    const response = await apiFetchProxy(
      `stock/get-feed-by-date?ticker=${encodeURIComponent(ticker)}&lastPostId=${encodeURIComponent(lastPostId)}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  /**
   * Fetches the hashtag feed sorted by date.
   *
   * @param lastPostId - The ID of the last post retrieved for pagination purposes.
   * @param hashtag - Hashtag to filter the feed by.
   * @returns A promise that resolves to an object containing the posts sorted by date and the last post ID.
   */
  getHashtagFeedByDate = async (
    lastPostId: string,
    hashtag: string
  ): Promise<{
    postsByDate: Post[];
    lastPostIdByDate: string;
  }> => {
    const response = await apiFetchProxy(
      `hashtag/get-feed-by-date?hashtag=${encodeURIComponent(hashtag)}&lastPostId=${encodeURIComponent(lastPostId)}`
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
    const response = await apiFetchProxy(
      `post/get-feed-by-like?lastPostId=${encodeURIComponent(lastPostId)}`
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
   * @param username - The ID of the user to retrieve the feed for.
   * @returns A promise that resolves to an object containing the posts sorted by date and the last post ID.
   */
  getUserPostsByLike = async (
    lastPostId: string,
    username: string
  ): Promise<{
    postsByLike: Post[];
    lastPostIdByLike: string;
  }> => {
    const response = await apiFetchProxy(
      `user/get-user-posts-by-like?username=${encodeURIComponent(username)}&lastPostId=${encodeURIComponent(lastPostId)}`
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
   * @param ticker - The ticker symbol of the stock.
   * @returns A promise that resolves to an object containing the posts sorted by like count and the last post ID.
   */
  getStockFeedByLike = async (
    lastPostId: string,
    ticker: string
  ): Promise<{
    postsByLike: Post[];
    lastPostIdByLike: string;
  }> => {
    const response = await apiFetchProxy(
      `stock/get-feed-by-like?ticker=${encodeURIComponent(ticker)}&lastPostId=${encodeURIComponent(lastPostId)}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };

  /**
   * Fetches the hashtag feed sorted by like count.
   *
   * @param lastPostId - The ID of the last post retrieved for pagination purposes.
   * @param hashtag - Hashtag to filter the feed by.
   * @returns A promise that resolves to an object containing the posts sorted by like count and the last post ID.
   */
  getHashtagFeedByLike = async (
    lastPostId: string,
    hashtag: string
  ): Promise<{
    postsByLike: Post[];
    lastPostIdByLike: string;
  }> => {
    const response = await apiFetchProxy(
      `hashtag/get-feed-by-like?hashtag=${encodeURIComponent(hashtag)}&lastPostId=${encodeURIComponent(lastPostId)}`
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
    const response = await apiFetchProxy(
      `post/get-post-by-id?postId=${encodeURIComponent(postId)}`
    );

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
    const response = await apiFetchProxy('post/like-post', 'POST', JSON.stringify({ postId }));

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
    const response = await apiFetchProxy('post/repost-post', 'POST', JSON.stringify({ postId }));

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  };
}

const postApiService = new PostApiService();
export default postApiService;
