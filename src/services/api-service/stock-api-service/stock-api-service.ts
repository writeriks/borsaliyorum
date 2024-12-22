import { apiFetchProxy } from '@/services/api-service/fetch-proxy';
import { auth } from '@/services/firebase-service/firebase-config';

class StockApiService {
  /**
   * Follows a stock.
   * @param ticker - The ID of the stock to follow.
   * @returns The response from the follow operation.
   */
  followStock = async (ticker: string): Promise<boolean> => {
    const response = await apiFetchProxy('/stock/follow-stock', 'POST', JSON.stringify({ ticker }));
    return response.ok;
  };

  /**
   * Unfollows a stock.
   * @param ticker - The ID of the stock to unfollow.
   * @returns The response from the follow operation.
   */
  unfollowStock = async (ticker: string): Promise<boolean> => {
    const response = await apiFetchProxy(
      '/stock/unfollow-stock',
      'POST',
      JSON.stringify({ ticker })
    );
    return response.ok;
  };
}

const stockApiService = new StockApiService();
export default stockApiService;
