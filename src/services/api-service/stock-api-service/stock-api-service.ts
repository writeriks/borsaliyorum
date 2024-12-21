import { auth } from '@/services/firebase-service/firebase-config';

class StockApiService {
  /**
   * Follows a stock.
   * @param ticker - The ID of the stock to follow.
   * @returns The response from the follow operation.
   */
  followStock = async (ticker: string): Promise<boolean> => {
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch('/api/stock/follow-stock', {
      method: 'POST',
      body: JSON.stringify({ ticker }),
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  };

  /**
   * Unfollows a stock.
   * @param ticker - The ID of the stock to unfollow.
   * @returns The response from the follow operation.
   */
  unfollowStock = async (ticker: string): Promise<boolean> => {
    const idToken = await auth.currentUser?.getIdToken();

    const response = await fetch('/api/stock/unfollow-stock', {
      method: 'POST',
      body: JSON.stringify({ ticker }),
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  };
}

const stockApiService = new StockApiService();
export default stockApiService;
