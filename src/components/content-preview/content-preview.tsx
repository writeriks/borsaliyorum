import contentHelper from '@/components/content/content-helper';
import useDebounce from '@/hooks/userDebounce';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import React, { useMemo } from 'react';

interface ContentPreviewProps {
  content: string;
}

const UrlContentPreview: React.FC<ContentPreviewProps> = ({ content }) => {
  const urlsFromContent = useMemo(() => contentHelper.extractURL(content), [content]);
  const url = urlsFromContent?.length ? urlsFromContent[0] : null;

  const debouncedUrl = useDebounce(url, 300);

  const { data } = useQuery({
    queryKey: [`get-content-preview-${debouncedUrl}`],
    queryFn: () => postApiService.getContentPreview(debouncedUrl as string),
    enabled: !!debouncedUrl,
  });
  const imageUrl = data?.image
    ? `/api/image-proxy?imageUrl=${encodeURIComponent(data.image)}`
    : undefined;

  const handleClick = (): void => {
    window.open(url as string, '_blank');
  };

  return (
    <>
      {data ? (
        <div
          id='content-preview'
          className='flex flex-col rounded-md border mt-3 gap-4 min-h-[150px] p-2 w-80 md:w-[500px] overflow-hidden cursor-pointer'
          onClick={handleClick}
        >
          <div className='flex flex-col overflow-hidden '>
            <h3 className='font-bold text-base truncate line-clamp-1'>{data.title}</h3>
            <p className='text-sm text-gray-500 break-words line-clamp-3'>{data.description}</p>
          </div>
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={data.title}
              loading='lazy'
              width={400}
              height={400}
              decoding='async'
              data-nimg='1'
              className='w-full max-h-80 object-cover rounded-lg' // w-full max-h-80 object-cover rounded-lg
            />
          )}
        </div>
      ) : null}
    </>
  );
};

export default UrlContentPreview;
