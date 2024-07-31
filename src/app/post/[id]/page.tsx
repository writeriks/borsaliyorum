'use client';

import React, { useEffect, useState } from 'react';

import Post from '@/components/post/post';
import Comment from '@/components/comment/comment';
import { Post as PostType } from '@/services/firebase-service/types/db-types/post';
import { useParams, useRouter } from 'next/navigation';
import { MoveLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import postApiService from '@/services/api-service/post-api-service/post-api-service';
import NewComment from '@/components/new-comment/new-comment';
import useUser from '@/hooks/useUser';
import Discover from '@/components/doscover/discover';
import { useMutation } from '@tanstack/react-query';
import { Comment as CommentType } from '@/services/firebase-service/types/db-types/comments';
import { useDispatch } from 'react-redux';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';
import useInfiniteScroll from '@/hooks/useInfiniteScroll';
import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import { LoadingSkeletons } from '@/app/constants';

const PostDetail = (): React.ReactNode => {
  const { back } = useRouter();
  const query = useParams();
  const { fbAuthUser } = useUser();
  const [post, setPost] = useState<PostType>();
  const dispatch = useDispatch();

  const [comments, setComments] = useState<CommentType[]>([]);
  const [lastCommentId, setLastCommentId] = useState('');
  const [mention, setMention] = useState({ username: '' });
  const [isNewCommentAdded, setIsNewCommentAdded] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const postId = post?.postId;

      if (lastCommentId === undefined || !postId) {
        return;
      }

      return postApiService.getCommentsByPostId(postId, lastCommentId);
    },
    onSuccess: (data: any) => {
      if (data) {
        if (isNewCommentAdded) {
          const lastCommentIdOnScreen = comments[comments.length - 1]?.commentId ?? '';
          setLastCommentId(lastCommentIdOnScreen);
          setComments([...data.comments, ...comments]);
          setIsNewCommentAdded(false);
        } else {
          setComments([...comments, ...data.comments]);
          setLastCommentId(data.lastCommentId);
        }
      }
    },
    onError: () => {
      dispatch(
        setUINotification({
          message: 'Bir hata oluştu.',
          notificationType: UINotificationEnum.ERROR,
        })
      );
    },
  });

  useEffect(() => {
    if (post) {
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post]);

  useEffect(() => {
    const fetchPost = async (): Promise<void> => {
      const result = await postApiService.getPostById(query.id as string);

      setPost(result);
    };

    if (!fbAuthUser) return;

    fetchPost();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbAuthUser, query.id]);

  useInfiniteScroll({
    isFetchingNextPage: mutation.isPending,
    fetchNextPage: mutation.mutate,
  });

  const handleCommentClick = (comment: CommentType): void => {
    setMention({
      username: comment.username,
    });

    const input = document.getElementById('mentionsInput');
    input?.focus();
  };

  const handleCommentSubmit = (): void => {
    setLastCommentId('');
    setIsNewCommentAdded(true);

    mutation.mutate();
  };

  return (
    <div className='flex min-w-full justify-center'>
      <div className='flex flex-col w-full max-w-3xl '>
        {post ? (
          <div className='lg:p-6 p-2 w-full self-start'>
            {/* TODO: when click back it should scroll to the previous post */}
            <Card onClick={() => back()} className='cursor-pointer'>
              <span className='inline-flex items-center justify-center p-3 bg-transparent'>
                <MoveLeft className='mr-2 h-5 w-5' /> Geri
              </span>
            </Card>
            <Post post={post} />
            <div className='m-2'>
              <NewComment onSubmitted={handleCommentSubmit} mention={mention} post={post} />
            </div>
            {comments.map(comment => (
              <Comment
                onCommentClick={handleCommentClick}
                key={comment.commentId}
                comment={comment}
              />
            ))}
            {mutation.isPending && <LoadingSkeleton type={LoadingSkeletons.POST} />}
          </div>
        ) : (
          <LoadingSkeleton type={LoadingSkeletons.POST} />
        )}
      </div>
      <div className='lg:flex max-1500:hidden sticky top-52 p-2 h-[260px] flex-col lg:w-[260px]'>
        <Discover />
      </div>
    </div>
  );
};

export default PostDetail;
