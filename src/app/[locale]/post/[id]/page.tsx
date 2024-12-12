'use client';

import React, { useEffect, useState } from 'react';

import { useParams } from 'next/navigation';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import useUser from '@/hooks/useUser';
import { useQuery } from '@tanstack/react-query';

import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import { LoadingSkeletons } from '@/app/constants';
import { Post as PostType } from '@prisma/client';
import PostDetail from '@/components/post/post-detail';

const PostDetailPage = (): React.ReactNode => {
  const query = useParams();
  const { fbAuthUser } = useUser();
  const [post, setPost] = useState<PostType>();

  const { refetch: getPostById } = useQuery({
    queryKey: ['get-post-by-id'],
    queryFn: () => postApiService.getPostById(query.id as string),
    enabled: false,
  });

  useEffect(() => {
    window.scrollTo(0, 0);

    const fetchPost = async (): Promise<void> => {
      const { data: result } = await getPostById();

      setPost(result);
    };

    if (!fbAuthUser) return;

    fetchPost();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbAuthUser, query.id]);

  return post ? <PostDetail post={post} /> : <LoadingSkeleton type={LoadingSkeletons.POST} />;
};

export default PostDetailPage;
