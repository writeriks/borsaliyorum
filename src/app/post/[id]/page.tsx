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
import { useMutation, useQuery } from '@tanstack/react-query';
import { Comment as CommentType } from '@/services/firebase-service/types/db-types/comments';
import { useDispatch } from 'react-redux';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';

import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import { LoadingSkeletons } from '@/app/constants';
import { Icons } from '@/components/ui/icons';

const PostDetail = (): React.ReactNode => {
  const { back } = useRouter();
  const query = useParams();
  const { fbAuthUser } = useUser();
  const [post, setPost] = useState<PostType>();
  const dispatch = useDispatch();

  const [comments, setComments] = useState<CommentType[]>([]);
  const [newCommentsByUser, setNewCommentsByUser] = useState<CommentType[]>([]);
  const [lastCommentId, setLastCommentId] = useState('');
  const [isLoadMoreClicked, setIsLoadMoreClicked] = useState(false);
  const [mention, setMention] = useState({ username: '' });

  const { refetch: getPostById } = useQuery({
    queryKey: ['get-post-by-id'],
    queryFn: () => postApiService.getPostById(query.id as string),
    enabled: false,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const postId = post?.postId;

      if (lastCommentId === undefined || !postId) {
        return;
      }

      return postApiService.getCommentsByPostId(postId, lastCommentId);
    },
    onSuccess: data => {
      if (data) {
        const localCommentIds = newCommentsByUser.map(item => item.commentId);
        const filteredNewComments = (data.comments as CommentType[]).filter(
          item => !localCommentIds.includes(item.commentId) && item.userId
        );

        setComments([...comments, ...(filteredNewComments as CommentType[])]);
        setLastCommentId(data.lastCommentId);
        setIsLoadMoreClicked(false);
      }
    },
    onError: error => {
      setIsLoadMoreClicked(false);

      dispatch(
        setUINotification({
          message: error.message,
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
    window.scrollTo(0, 0);

    const fetchPost = async (): Promise<void> => {
      const { data: result } = await getPostById();

      setPost(result);
    };

    if (!fbAuthUser) return;

    fetchPost();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fbAuthUser, query.id]);

  const handleCommentClick = (comment: CommentType): void => {
    setMention({
      username: comment.username,
    });

    const input = document.getElementById('mentionsInput');
    input?.focus();
  };

  const handleCommentSubmit = (userAddedComment: CommentType): void => {
    setNewCommentsByUser([userAddedComment, ...newCommentsByUser]);
    setComments([userAddedComment, ...comments]);
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
            <NewComment
              onSubmit={comment => handleCommentSubmit(comment)}
              mention={mention}
              post={post}
            />
            {comments.map(comment => (
              <Comment
                onCommentClick={handleCommentClick}
                key={comment.commentId}
                comment={comment}
              />
            ))}
            {comments.length && lastCommentId ? (
              <div
                onClick={() => mutation.mutate()}
                className='flex flex-row min-w-full items-center mt-1 text-sm justify-center cursor-pointer'
              >
                {isLoadMoreClicked ? (
                  <Icons.spinner className='h-4 w-4 animate-spin' />
                ) : (
                  <a
                    className='p-4 text-blue-400 hover:underline'
                    onClick={() => setIsLoadMoreClicked(true)}
                  >
                    Daha Fazla Yükle
                  </a>
                )}
              </div>
            ) : null}
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
