import React, { ChangeEvent } from 'react';

//@ts-expect-error
import imageResize from 'image-resize';

import { Button } from '@/components/ui/button';
import { ImagePlus } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';

interface ImageUploaderProps {
  onImageUpload: (image: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  children?: React.ReactNode;
  disabled?: boolean;
}

const IMAGE_SIZE_LIMIT = 3;
const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  fileInputRef,
  disabled,
  children,
}) => {
  const dispatch = useDispatch();

  const checkIfStorageLimitReached = (image: string | ArrayBuffer, limit: number): boolean => {
    const bytes = new Blob([JSON.stringify(image)]).size;
    const megabytes = bytes / (1024 * 1024);

    return megabytes >= limit;
  };
  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async e => {
        if (e.target?.result) {
          const didReacStorageLimit = checkIfStorageLimitReached(
            e.target?.result,
            IMAGE_SIZE_LIMIT
          );
          if (didReacStorageLimit) {
            dispatch(
              setUINotification({
                message: 'Maksimum 3MB boyutunda resim yükleyebilirsiniz.',
                notificationType: UINotificationEnum.ERROR,
              })
            );
            return;
          }
          const image = await imageResize(e.target?.result, {
            format: 'png',
            width: 640,
          });

          onImageUpload(image as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = (): void => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <Button
        className='flex items-center p-1 w-10 h-10 rounded-full'
        variant='default'
        onClick={handleImageUpload}
        disabled={disabled}
      >
        {children ? children : <ImagePlus />}
      </Button>
      <input
        type='file'
        title='Upload Image'
        ref={fileInputRef}
        className='hidden'
        accept='image/*'
        onChange={handleImageChange}
      />
    </>
  );
};

export default ImageUploader;
