import React from 'react';
import NewPost from '@/components/new-post/new-post';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface NewPostDialogProps {
  isOpen: boolean;
  onNewPostModalOpenChange(): void;
}

const NewPostDialog: React.FC<NewPostDialogProps> = ({ isOpen, onNewPostModalOpenChange }) => (
  <Dialog open={isOpen} onOpenChange={onNewPostModalOpenChange}>
    <DialogContent>
      <NewPost />
    </DialogContent>
  </Dialog>
);

export default NewPostDialog;
