import EntryActions from '@/components/entry-actions/entry-actions';
import { CardFooter } from '@/components/ui/card';
import { Post, User } from '@prisma/client';
import React from 'react';

interface EntryFooterProps {
  onCommentClick?: (commentor: User) => void;
  onPostClick?: (post: Post) => void;
  commentor?: User;
  entry: any;
}

const EntryFooter: React.FC<EntryFooterProps> = props => (
  <CardFooter className='flex justify-end'>
    <EntryActions {...props} />
  </CardFooter>
);

export default EntryFooter;
