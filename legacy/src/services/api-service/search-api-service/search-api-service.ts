import { apiFetchProxy } from '@/services/api-service/fetch-proxy';
import { SearchResponseType } from '@/services/api-service/search-api-service/search-api-service-types';

class SearchApiService {
  /*
   * Get search results
   * @returns Search results stocks, tags, and users
   */
  getSearchResults = async (searchTerm: string): Promise<SearchResponseType> => {
    const response = await apiFetchProxy(`search/get-search-results?q=${searchTerm}`);

    if (!response.ok) throw new Error(response.statusText);

    return response.json();
  };
}

const searchApiService = new SearchApiService();
export default searchApiService;
