export interface Suggestion {
  id: string;
  name: string;
  type: 'mention' | 'hashtag' | 'cashtag';
}

export interface EditorState {
  content: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface SuggestionListProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
  position: { top: number; left: number } | null;
}
