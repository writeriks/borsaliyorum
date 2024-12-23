import contentHelper from '@/components/content/content-helper';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';

interface ContentPreviewProps {
  content: string;
}

// TODO: Follow below url to implement the ContentPreview component
// https://dev.to/rahulj9a/how-to-build-simple-link-preview-without-any-library-in-js-2j84

const ContentPreview: React.FC<ContentPreviewProps> = ({ content }) => {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const urlFromContent = contentHelper.extractURL(content);
    if (urlFromContent) {
      setUrl(urlFromContent);
    }
  }, [content]);

  /* const { data } = useQuery({
    queryKey: ['get-content-preview'],
    queryFn: () => postApiService.getContentPreview(content),
  }); */

  return <div>ContentPreview</div>;
};

export default ContentPreview;
