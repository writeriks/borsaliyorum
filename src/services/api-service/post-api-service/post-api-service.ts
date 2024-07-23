import { auth } from '@/services/firebase-service/firebase-config';
import { Post } from '@/services/firebase-service/types/db-types/post';
import { DocumentData } from 'firebase/firestore';

class PostApiService {
  lastPostIdByDate = null;
  lastPostIdByLike = null;

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

  getFeed = async (): Promise<{
    postsByDate: DocumentData[];
    postsByLikes: DocumentData[];
  }> => {
    const requestBody = {
      lastPostIdByDate: this.lastPostIdByDate,
      lastPostIdByLike: this.lastPostIdByLike,
    };

    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch(`/api/post/get-feed`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(response.statusText);

    const data = await response.json();

    this.lastPostIdByDate = data.lastPostIdByDate;
    this.lastPostIdByLike = data.lastPostIdByLike;

    return data;
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
}

const postApiService = new PostApiService();
export default postApiService;
