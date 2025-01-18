'use client';

import React, { useEffect, useRef, useState } from 'react';

import Post from '@/components/post/post';
import Comment from '@/components/comment/comment';

import { MoveLeft } from 'lucide-react';
import commentApiService from '@/services/api-service/comment-api-service/comment-api-service';
import NewComment from '@/components/new-comment/new-comment';
import useUser from '@/hooks/useUser';
import { useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { setUINotification, UINotificationEnum } from '@/store/reducers/ui-reducer/ui-slice';

import LoadingSkeleton from '@/components/loading-skeleton/loading-skeleton';
import { LoadingSkeletons } from '@/app/constants';
import { Icons } from '@/components/ui/icons';
import { Comment as CommentType, Post as PostType, User } from '@prisma/client';
import { useTranslations } from 'next-intl';

export interface PostDetailProp {
  post: PostType;
  onPostDelete: (postId: number) => void;
  onBackClick?: () => void;
}
const PostDetail: React.FC<PostDetailProp> = ({ post, onBackClick, onPostDelete }) => {
  const { currentUser } = useUser();
  const dispatch = useDispatch();
  const t = useTranslations();

  const [comments, setComments] = useState<CommentType[]>([]);
  const [newCommentsByUser, setNewCommentsByUser] = useState<CommentType[]>([]);
  const [lastCommentId, setLastCommentId] = useState('');
  const [isLoadMoreClicked, setIsLoadMoreClicked] = useState(false);
  const [mention, setMention] = useState({ username: '' });
  const isFetching = useRef(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const postId = post?.postId;

      if (lastCommentId === undefined || !postId || isFetching.current) {
        return;
      }

      isFetching.current = true;

      return commentApiService.getCommentsByPostId(postId, lastCommentId);
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
      isFetching.current = false;
    },
    onError: error => {
      setIsLoadMoreClicked(false);

      dispatch(
        setUINotification({
          message: error.message,
          notificationType: UINotificationEnum.ERROR,
        })
      );
      isFetching.current = false;
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

    if (!currentUser) return;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleCommentClick = (commentor: User): void => {
    setMention({
      username: commentor.username,
    });

    const input = document.getElementById('mentionsInput');
    input?.focus();
  };

  const handleCommentSubmit = (userAddedComment: CommentType): void => {
    setNewCommentsByUser([userAddedComment, ...newCommentsByUser]);
    setComments([userAddedComment, ...comments]);
  };

  const handleCommentDelete = (deletedCommentId: number): void => {
    const filteredComments = comments.filter(cmt => cmt.commentId !== deletedCommentId);

    setComments([...filteredComments]);
  };

  return (
    <div className='flex flex-col w-full max-w-2xl '>
      {post ? (
        <div className='lg:p-6 p-2 w-full self-start'>
          <span
            onClick={onBackClick}
            className='cursor-pointer inline-flex items-center justify-center p-3 bg-transparent'
          >
            <MoveLeft className='mr-2 h-5 w-5' /> {t('PostDetail.back')}
          </span>
          <Post onDeleteClick={onPostDelete} post={post} />
          <NewComment
            onSubmit={comment => handleCommentSubmit(comment)}
            mention={mention}
            postOwnerId={post.userId}
            postId={post.postId}
          />
          {comments.map(comment => (
            <Comment
              onDeleteClick={handleCommentDelete}
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
                  {t('PostDetail.loadMore')}
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
  );
};

export default PostDetail;
