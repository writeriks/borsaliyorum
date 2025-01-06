import React, { ChangeEvent } from 'react';

//@ts-expect-error
import imageResize from 'image-resize';

import { Button } from '@/components/ui/button';
import { ImagePlus } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  onImageUpload: (image: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

const IMAGE_SIZE_LIMIT = 3;
const IMAGE_COMPRESS_LIMIT = 0.3;
const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  fileInputRef,
  disabled,
  children,
  className,
}) => {
  const dispatch = useDispatch();

  const getImageSize = (image: string | ArrayBuffer): number => {
    const bytes = new Blob([JSON.stringify(image)]).size;
    const megabytes = bytes / (1024 * 1024);

    return megabytes;
  };

  const compressImage = async (image: string | ArrayBuffer): Promise<any> => {
    return imageResize(image, {
      format: 'png',
      width: 640,
    });
  };

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async ({ target }) => {
        if (target?.result) {
          const imageSize = getImageSize(target?.result);
          if (imageSize > IMAGE_SIZE_LIMIT) {
            dispatch(
              setUINotification({
                message: 'En fazla 3MB boyutunda resim yükleyebilirsiniz.',
                notificationType: UINotificationEnum.ERROR,
              })
            );
            return;
          }

          let image = target.result;
          if (imageSize > IMAGE_COMPRESS_LIMIT) {
            image = await compressImage(target.result);
          }

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
        className={cn('flex items-center p-1 w-8 h-8 rounded-full', className)}
        variant='default'
        onClick={handleImageUpload}
        disabled={disabled}
        type='button'
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
