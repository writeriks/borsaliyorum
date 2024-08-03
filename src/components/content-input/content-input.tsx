import React, { useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Mention, MentionsInput, SuggestionDataItem } from 'react-mentions';

import useDebounce from '@/hooks/userDebounce';

import { TagsEnum } from '@/services/firebase-service/types/db-types/tag';
import { tickers } from '@/tickers';
import userApiService from '@/services/api-service/user-api-service/user-api-service';

interface ContentInputProps {
  content: string;
  setContent: (content: string) => void;
  onSetCashTags?: (cashTag: string) => void;
  placeholder?: string;
  autoMention?: string;
}

const ContentInput: React.FC<ContentInputProps> = ({
  content,
  setContent,
  placeholder,
  onSetCashTags,
  autoMention,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mentionSuggestions, setMentionSuggestions] = useState<SuggestionDataItem[]>([]);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { refetch } = useQuery({
    queryKey: ['fetch-mentions'],
    queryFn: () => userApiService.getUsersByName(debouncedSearchTerm),
    enabled: false,
  });

  useEffect(() => {
    const fetchMentions = async (): Promise<void> => {
      if (debouncedSearchTerm) {
        const { data } = await refetch();
        const suggestions = (data ?? []).map(user => ({
          id: user.username,
          display: user.username,
        }));

        setMentionSuggestions(suggestions);
      }
    };
    fetchMentions();
  }, [refetch, debouncedSearchTerm]);

  useEffect(() => {
    if (autoMention) {
      const autoMentionPrefix = `@(${autoMention}) `;
      if (!content.startsWith(autoMentionPrefix)) {
        setContent(autoMentionPrefix + content);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMention, content]);

  const onMentionSearch = (
    search: string,
    callback: (suggestions: SuggestionDataItem[]) => void
  ): void => {
    if (search.length === 0) return;

    setSearchTerm(search);
    callback(mentionSuggestions);
  };

  const onCashtagSearch = (
    search: string,
    callback: (suggestions: SuggestionDataItem[]) => void
  ): void => {
    if (search.length === 0) return;

    const suggestions = tickers
      .filter(ticker => ticker.display?.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 5);

    callback(suggestions);
  };

  return (
    <MentionsInput
      id='mentionsInput'
      autoFocus
      placeholder={placeholder ? placeholder : 'Ne düşünüyorsun?'}
      className='mentions resize-none break-words break-all'
      value={content}
      onChange={e => setContent(e.target.value)}
      maxLength={1000}
    >
      <Mention
        markup='$(__id__)'
        trigger={TagsEnum.CASHTAG}
        data={onCashtagSearch}
        className='bg-slate-700'
        onAdd={tags => onSetCashTags && onSetCashTags(tags as string)}
        displayTransform={id => `${TagsEnum.CASHTAG}${id}`}
      />
      <Mention
        markup='@(__id__)'
        trigger={TagsEnum.MENTION}
        data={onMentionSearch || []}
        onAdd={() => setMentionSuggestions([])}
        className='bg-slate-700'
        displayTransform={id => `${TagsEnum.MENTION}${id}`}
      />
      <Mention
        className='bg-slate-700'
        markup='#(__id__)'
        trigger={TagsEnum.HASHTAG}
        data={search => [{ id: search, display: search }]}
        displayTransform={id => `${TagsEnum.HASHTAG + id}`}
      />
    </MentionsInput>
  );
};

export default ContentInput;
