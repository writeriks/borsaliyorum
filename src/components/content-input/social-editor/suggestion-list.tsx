import React, { useState, useEffect } from 'react';
import type { SuggestionListProps } from './types';

export const SuggestionList = ({
  suggestions,
  onSelect,
  position,
}: SuggestionListProps): React.ReactNode => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
          e.preventDefault();
          onSelect(suggestions[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          //@ts-ignore
          onSelect(null);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex, onSelect]);

  if (!position || suggestions.length === 0) return null;

  return (
    <div
      className='absolute z-10 bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto'
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.id}
          className={`w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none ${
            index === selectedIndex ? 'bg-gray-100' : ''
          }`}
          onClick={() => onSelect(suggestion)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          {suggestion.name}
        </button>
      ))}
    </div>
  );
};
