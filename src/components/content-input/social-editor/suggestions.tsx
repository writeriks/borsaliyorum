import { Suggestion } from '@/components/content-input/social-editor/types';

// Mock data - In a real app, these would come from an API
export const mockSuggestions = {
  mentions: [
    { id: '1', name: 'John Doe', type: 'mention' },
    { id: '2', name: 'Jane Smith', type: 'mention' },
    { id: '3', name: 'Alice Johnson', type: 'mention' },
  ],
  hashtags: [
    { id: '1', name: 'javascript', type: 'hashtag' },
    { id: '2', name: 'reactjs', type: 'hashtag' },
    { id: '3', name: 'webdev', type: 'hashtag' },
  ],
  cashtags: [
    { id: '1', name: 'AAPL', type: 'cashtag' },
    { id: '2', name: 'GOOGL', type: 'cashtag' },
    { id: '3', name: 'MSFT', type: 'cashtag' },
  ],
} as const;

export const getSuggestions = (trigger: string, query: string): Suggestion[] => {
  const suggestions =
    {
      '@': mockSuggestions.mentions,
      '#': mockSuggestions.hashtags,
      '$': mockSuggestions.cashtags,
    }[trigger] || [];

  return suggestions.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));
};
