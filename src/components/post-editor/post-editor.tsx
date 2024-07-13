import React from 'react';

import { Mention, MentionsInput, SuggestionDataItem } from 'react-mentions';

import userService from '@/services/user-service/user-service';

import { TagsEnum } from '@/services/firebase-service/types/db-types/tag';
import { tickers } from '@/tickers';

interface PostEditorProps {
  content: string;
  setContent: (content: string) => void;
}

const PostEditor: React.FC<PostEditorProps> = ({ content, setContent }) => {
  const onMentionSearch = async (
    search: string,
    callback: (suggestions: SuggestionDataItem[]) => void
  ): Promise<void> => {
    if (search.length === 0) return;

    const users = await userService.getUsersByName(search);
    const suggestions: SuggestionDataItem[] = (users ?? []).map(user => ({
      id: user.username,
      display: user.username,
    }));

    callback(suggestions);
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
      autoFocus
      placeholder='$TUPRS - Ne düşünüyorsun?'
      className='mentions'
      value={content}
      onChange={e => setContent(e.target.value)}
      maxLength={1000}
    >
      <Mention
        markup='$(__id__)'
        trigger={TagsEnum.CASHTAG}
        data={onCashtagSearch}
        className='bg-slate-700'
        displayTransform={id => `${TagsEnum.CASHTAG}${id}`}
      />
      <Mention
        markup='@(__id__)'
        trigger={TagsEnum.MENTION}
        data={onMentionSearch || []}
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

export default PostEditor;
