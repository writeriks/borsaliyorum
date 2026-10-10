import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setIsNewPostModalOpen } from '@/store/reducers/ui-reducer/ui-slice';

const NewPostTriggerMobile: React.FC = () => {
  const dispatch = useDispatch();
  return (
    <Button
      variant='ghost'
      size='icon'
      className='bg-bluePrimary w-[50px] h-[50px] text-muted-foreground rounded-full p-2 hover:bg-muted-foreground hover:text-background focus:bg-muted-foreground focus:text-background'
      onClick={() => dispatch(setIsNewPostModalOpen(true))}
    >
      <Pencil className='w-7 h-7 text-white' />
      <span className='sr-only'>Yeni Gönderi</span>
    </Button>
  );
};

export default NewPostTriggerMobile;
