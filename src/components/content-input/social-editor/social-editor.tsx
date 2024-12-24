import React, { useState, useRef, useEffect } from 'react';
import type { Suggestion } from './types';
import { SuggestionList } from './suggestion-list';
import {
  findTriggerIndex,
  convertUrlsToLinks,
  styleMentions,
  getCaretPosition,
  setCaretPosition,
} from './utils';
import { getSuggestions } from './suggestions';

export const SocialEditor = (): React.ReactNode => {
  const [content, setContent] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionPosition, setSuggestionPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [currentTrigger, setCurrentTrigger] = useState<string | null>(null);
  const caretPositionRef = useRef<number>(0);

  const handleInput = (e: React.FormEvent<HTMLDivElement>): void => {
    const text = e.currentTarget.textContent || '';
    setContent(text);

    if (editorRef.current) {
      caretPositionRef.current = getCaretPosition(editorRef.current);
    }

    const triggerIndex = findTriggerIndex(text, caretPositionRef.current);

    if (triggerIndex >= 0) {
      const trigger = text[triggerIndex];
      const query = text.slice(triggerIndex + 1, caretPositionRef.current);

      if (query.length > 0 && !query.includes(' ')) {
        const matchingSuggestions = getSuggestions(trigger, query);
        setSuggestions(matchingSuggestions);
        setCurrentTrigger(trigger);

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          if (editorRef.current) {
            const editorRect = editorRef.current.getBoundingClientRect();
            setSuggestionPosition({
              top: rect.bottom - editorRect.top,
              left: rect.left - editorRect.left,
            });
          }
        }
      } else {
        setSuggestions([]);
        setSuggestionPosition(null);
      }
    } else {
      setSuggestions([]);
      setSuggestionPosition(null);
    }
  };

  const handleSuggestionSelect = (suggestion: Suggestion | null): void => {
    if (!suggestion) {
      setSuggestions([]);
      setSuggestionPosition(null);
      return;
    }

    if (!editorRef.current || !currentTrigger) return;

    const text = editorRef.current.textContent || '';
    const triggerIndex = findTriggerIndex(text, caretPositionRef.current);

    if (triggerIndex >= 0) {
      const prefix = text.slice(0, triggerIndex);
      const suffix = text.slice(caretPositionRef.current);
      const newContent = `${prefix}${currentTrigger}${suggestion.name} ${suffix}`;

      setContent(newContent);

      const newPosition = triggerIndex + currentTrigger.length + suggestion.name.length + 1;
      caretPositionRef.current = newPosition;
    }

    setSuggestions([]);
    setSuggestionPosition(null);
  };

  const processContent = (text: string): string => {
    let processed = convertUrlsToLinks(text);
    processed = styleMentions(processed);
    return processed;
  };

  useEffect(() => {
    if (editorRef.current) {
      const processedContent = processContent(content);
      if (editorRef.current.innerHTML !== processedContent) {
        editorRef.current.innerHTML = processedContent;
        setCaretPosition(editorRef.current, caretPositionRef.current);
      }
    }
  }, [content]);

  return (
    <div className='relative w-full max-w-2xl mx-auto'>
      <div
        ref={editorRef}
        contentEditable
        className='min-h-[150px] p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
        onInput={handleInput}
        //@ts-expect-error
        placeholder="What's on your mind?"
      />
      <SuggestionList
        suggestions={suggestions}
        onSelect={handleSuggestionSelect}
        position={suggestionPosition}
      />
    </div>
  );
};
