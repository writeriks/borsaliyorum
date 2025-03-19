import React from 'react';

interface SearchSectionProps {
  icon: React.ElementType;
  title: string;
  items: any[];
  renderItem: (item: any) => React.ReactNode;
}

const SearchSection: React.FC<SearchSectionProps> = ({ icon: Icon, title, items, renderItem }) => (
  <div>
    <div className='flex items-center mb-2'>
      <Icon className='mr-2 h-4 w-4 text-muted-foreground' />
      <h3 className='text-sm font-medium'>{title}</h3>
    </div>
    <div className='space-y-2'>{items.map(renderItem)}</div>
  </div>
);

export default SearchSection;
