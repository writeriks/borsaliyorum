import { auth } from '@/services/firebase-service/firebase-config';
import { Tag } from '@/services/firebase-service/types/db-types/tag';

class DiscoverApiService {
  /*
   * Get trending tags
   * @returns  Array of trending tags
   */
  getTrends = async (): Promise<Tag[]> => {
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch('/api/discover/get-trends', {
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

const discoverApiService = new DiscoverApiService();
export default discoverApiService;
