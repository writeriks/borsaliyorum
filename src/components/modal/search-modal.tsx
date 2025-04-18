'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, User, TrendingUp, Hash, Loader2, SearchX } from 'lucide-react';
import useDebounce from '@/hooks/userDebounce';
import { useQuery } from '@tanstack/react-query';
import searchApiService from '@/services/api-service/search-api-service/search-api-service';
import { SearchResponseType } from '@/services/api-service/search-api-service/search-api-service-types';
import { useRouter } from '@/i18n/routing';
import UserIdCard from '@/components/user-profile-card/user-id-card';
import StockIdCard from '@/components/stock-profile-card/stock-id-card';
import HashtagIdCard from '@/components/hashtag-id-card/hashtag-id-card';
import { useTranslations } from 'next-intl';
import { useDispatch, useSelector } from 'react-redux';
import uiReducerSelector from '@/store/reducers/ui-reducer/ui-reducer-selector';
import SearchSection from './search-section';
import { setIsSearchModalOpen } from '@/store/reducers/ui-reducer/ui-slice';

export const SearchModal = (): React.ReactNode => {
  const t = useTranslations('search');
  const isSearchModalOpen = useSelector(uiReducerSelector.getIsSearchModalOpen);
  const dispatch = useDispatch();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedTerm = useDebounce(searchTerm, 300);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResponseType>({
    users: [],
    stocks: [],
    tags: [],
  });

  const { refetch } = useQuery({
    queryKey: ['search'],
    queryFn: () => searchApiService.getSearchResults(debouncedTerm),
    enabled: false,
  });

  // Fetch results when debounced term changes
  useEffect(() => {
    const initialResults: SearchResponseType = { users: [], stocks: [], tags: [] };

    if (!debouncedTerm.trim()) {
      setResults(initialResults);
      return;
    }

    const fetchResults = async (): Promise<void> => {
      setIsLoading(true);

      const { data } = await refetch();

      setResults(data ?? initialResults);
      setIsLoading(false);
    };

    fetchResults();
  }, [debouncedTerm, refetch]);

  // Focus input when modal opens
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isSearchModalOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isSearchModalOpen]);

  return (
    <Dialog
      open={isSearchModalOpen}
      onOpenChange={() => {
        dispatch(setIsSearchModalOpen(!isSearchModalOpen));
      }}
    >
      <DialogTrigger asChild>
        <span className='hidden lg:contents'>
          <Button
            onClick={() => {
              dispatch(setIsSearchModalOpen(true));
            }}
            variant='outline'
            className='w-full justify-start text-muted-foreground rounded-full'
          >
            <Search className='mr-2 h-4 w-4' />
            <span>{t('search')}...</span>
          </Button>
        </span>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px] h-[600px] flex flex-col overflow-hidden'>
        <DialogHeader>
          <DialogTitle className='sr-only'>{t('search')}</DialogTitle>
        </DialogHeader>
        <div className='space-y-4 flex-1 flex flex-col overflow-hidden'>
          {/* Search Input */}
          <div className='relative m-3'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              ref={inputRef}
              type='search'
              placeholder={t('placeholder')}
              className='pl-8'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Search Results */}
          <div className='flex-1  overflow-y-auto'>
            {isLoading ? (
              <div className='flex justify-center py-8'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
              </div>
            ) : (
              <div className='space-y-6 m-3'>
                {/* Users Section */}
                {results.users.length > 0 && (
                  <SearchSection
                    icon={User}
                    title={t('users')}
                    items={results.users}
                    renderItem={({ userId, username, profilePhoto, displayName }) => (
                      <UserIdCard
                        key={userId}
                        profilePhoto={profilePhoto ?? ''}
                        displayName={displayName ?? ''}
                        username={username ?? ''}
                        className='rounded-md hover:bg-muted cursor-pointer'
                        onClick={() => {
                          dispatch(setIsSearchModalOpen(false));
                          router.push(`/users/${username}`);
                        }}
                      />
                    )}
                  />
                )}

                {/* Stocks Section */}
                {results.stocks.length > 0 && (
                  <SearchSection
                    icon={TrendingUp}
                    title={t('stocks')}
                    items={results.stocks}
                    renderItem={({ ticker, stockId, companyName }) => (
                      <StockIdCard
                        key={stockId}
                        onClick={() => {
                          dispatch(setIsSearchModalOpen(false));
                          router.push(`/stocks/$${ticker}`);
                        }}
                        ticker={ticker}
                        companyName={companyName}
                      />
                    )}
                  />
                )}

                {/* Hashtags Section */}
                {results.tags.length > 0 && (
                  <SearchSection
                    icon={Hash}
                    title={t('hashtags')}
                    items={results.tags}
                    renderItem={({ tag, postCount }) => (
                      <HashtagIdCard
                        key={tag.tagId}
                        tagName={tag.tagName}
                        postCount={t('postCount', { query: postCount.toLocaleString() })}
                        onClick={() => {
                          dispatch(setIsSearchModalOpen(false));
                          router.push(`/tags/${tag.tagName}`);
                        }}
                      />
                    )}
                  />
                )}

                {/* No Results Handling */}
                {debouncedTerm &&
                  !isLoading &&
                  results.users.length === 0 &&
                  results.stocks.length === 0 &&
                  results.tags.length === 0 && (
                    <div className='flex flex-col items-center justify-center text-center text-muted-foreground'>
                      <p>{t('noResults', { query: debouncedTerm })}</p>
                      <SearchX size={100} />
                    </div>
                  )}

                {!debouncedTerm && !isLoading && (
                  <div className='flex flex-col items-center justify-center text-center py-8 text-muted-foreground'>
                    <Search size={100} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
