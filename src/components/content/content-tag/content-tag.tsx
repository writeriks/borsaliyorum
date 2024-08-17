import React from 'react';

interface ContentTagProps {
  tag: string;
  lineIndex: number;
  offset: number;
}

const ContentTag: React.FC<ContentTagProps> = ({ tag, lineIndex, offset }) => (
  <strong key={`${lineIndex}-${offset}`} className='bg-slate-300 dark:bg-slate-700'>
    {tag}
  </strong>
);

export default ContentTag;
