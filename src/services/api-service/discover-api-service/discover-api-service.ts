import { apiFetchProxy } from '@/services/api-service/fetch-proxy';
import { TrendingTopicsType } from '@/services/tag-service/constants';

class DiscoverApiService {
  /*
   * Get trending tags
   * @returns  Array of trending tags
   */
  getTrends = async (): Promise<TrendingTopicsType> => {
    const response = await apiFetchProxy('discover/get-trends');

    if (!response.ok) throw new Error(response.statusText);

    return response.json();
  };
}

const discoverApiService = new DiscoverApiService();
export default discoverApiService;
