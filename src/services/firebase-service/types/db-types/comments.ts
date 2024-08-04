import { MediaData, PostId } from '@/services/firebase-service/types/db-types/post';
import { UserId } from '@/services/firebase-service/types/db-types/user';

export type CommentId = string;

export interface Comment {
  commentId?: CommentId;
  postId: PostId;
  userId: UserId;
  username: string;
  likeCount?: number;
  media: MediaData;
  content: string;
  createdAt?: number;
  updatedAt?: number;
  isPositiveSentiment: boolean;
}

export enum CommentsCollectionEnum {
  COMMENT_ID = 'commentId',
  POST_ID = 'postId',
  USER_ID = 'userId',
  LIKE_COUNT = 'likeCount',
  MEDIA = 'media',
  CONTENT = 'content',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  IS_POSITIVE_SENTIMENT = 'isPositiveSentiment',
}
