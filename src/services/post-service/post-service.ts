import { auth } from '@/services/firebase-service/firebase-config';
import { Post } from '@/services/firebase-service/types/db-types/post';

class PostService {
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
}

const postService = new PostService();
export default postService;
