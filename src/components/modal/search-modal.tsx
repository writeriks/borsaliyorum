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

export const SearchModal = (): React.ReactNode => {
  const t = useTranslations('search');
  const [open, setOpen] = useState(false);
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
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          className='w-3/4 mr-2 ml-2 justify-start text-muted-foreground rounded-full'
        >
          <Search className='mr-2 h-4 w-4' />
          <span>{t('search')}...</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px] max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='sr-only'>{t('search')}</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='relative'>
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

          {isLoading ? (
            <div className='flex justify-center py-8'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
          ) : (
            <div className='space-y-6'>
              {/* Users section */}
              {results.users.length > 0 && (
                <div>
                  <div className='flex items-center mb-2'>
                    <User className='mr-2 h-4 w-4 text-muted-foreground' />
                    <h3 className='text-sm font-medium'>{t('users')}</h3>
                  </div>
                  <div className='space-y-2'>
                    {results.users.map(({ userId, username, profilePhoto, displayName }) => (
                      <UserIdCard
                        key={userId}
                        profilePhoto={profilePhoto ?? ''}
                        displayName={displayName ?? ''}
                        username={username ?? ''}
                        className='rounded-md hover:bg-muted cursor-pointer'
                        onClick={() => {
                          setOpen(false);
                          router.push(`/users/${username}`);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Stocks section */}
              {results.stocks.length > 0 && (
                <div>
                  <div className='flex items-center mb-2'>
                    <TrendingUp className='mr-2 h-4 w-4 text-muted-foreground' />
                    <h3 className='text-sm font-medium'>{t('stocks')}</h3>
                  </div>
                  <div className='space-y-2'>
                    {results.stocks.map(({ ticker, stockId, companyName }) => (
                      <StockIdCard
                        key={stockId}
                        onClick={() => {
                          setOpen(false);
                          router.push(`/stocks/$${ticker}`);
                        }}
                        ticker={ticker}
                        companyName={companyName}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Hashtags section */}
              {results.tags.length > 0 && (
                <div>
                  <div className='flex items-center mb-2'>
                    <Hash className='mr-2 h-4 w-4 text-muted-foreground' />
                    <h3 className='text-sm font-medium'>{t('hashtags')}</h3>
                  </div>
                  <div className='space-y-2'>
                    {results.tags.map(({ tag, postCount }) => (
                      <HashtagIdCard
                        key={tag.tagId}
                        tagName={tag.tagName}
                        postCount={t('postCount', { query: postCount.toLocaleString() })}
                        onClick={() => {
                          setOpen(false);
                          router.push(`/tags/${tag.tagName}`);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {debouncedTerm &&
                !isLoading &&
                results.users.length === 0 &&
                results.stocks.length === 0 &&
                results.tags.length === 0 && (
                  <>
                    <div className='flex justify-center '>
                      {' '}
                      {t('noResults', { query: debouncedTerm })}
                    </div>
                    <div className='flex items-center text-center  justify-center  text-muted-foreground'>
                      <SearchX size={100} />
                    </div>
                  </>
                )}

              {!debouncedTerm && !isLoading && (
                <div className='flex items-center text-center  justify-center py-8 text-muted-foreground'>
                  <Search size={100} />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
