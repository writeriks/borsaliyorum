import React from 'react';
import PostDetail from '@/components/post/post-detail';
import { Post as PostType } from '@prisma/client';

interface PostDetailModalProps {
  post: PostType;
  onBackClick: () => void;
}

const PostDetailModal: React.FC<PostDetailModalProps> = ({ post, onBackClick }) => (
  <PostDetail onBackClick={onBackClick} post={post} />
);

export default PostDetailModal;
