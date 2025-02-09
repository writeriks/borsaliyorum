import { notFound } from 'next/navigation';

import React from 'react';
import prisma from '@/services/prisma-service/prisma-client';
import { Post, User } from '@prisma/client';
import { withAuthentication } from '@/components/auth-wrapper/auth-wrapper';
import PageWrapper from '@/components/page-wrapper/page-wrapper';
import PostDetail from '@/components/post/post-detail';

interface StockDetailPageProps {
  params: { id: string };
  currentUser: User;
}

const PostPage = async ({
  params,
  currentUser,
}: StockDetailPageProps): Promise<React.ReactNode> => {
  const postId = decodeURIComponent(params.id);

  if (!postId) {
    return;
  }
  const post = await prisma.post.findUnique({
    where: { postId: parseInt(postId ?? '') },
    include: {
      _count: { select: { likedBy: true, comments: true } },
      likedBy: { where: { userId: currentUser.userId }, select: { postId: true } },
    },
  });

  if (!post) {
    notFound();
  }

  return (
    <PageWrapper currentUser={currentUser}>
      <PostDetail
        post={
          {
            ...post,
            likedByCurrentUser: post.likedBy.length > 0,
            likeCount: post._count.likedBy,
            commentCount: post._count.comments,
          } as Post
        }
      />
    </PageWrapper>
  );
};

export default withAuthentication(PostPage);
