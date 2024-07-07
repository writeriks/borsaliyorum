import { CommentId } from '@/services/firebase-service/types/db-types/comments';
import { UserId } from '@/services/firebase-service/types/db-types/user';
import { Timestamp } from 'firebase/firestore';

export interface CommentLikes {
  userId: UserId;
  commentId: CommentId;
  createdAt: Timestamp;
}

export enum CommentLikesEnum {
  USER_ID = 'userId',
  COMMENT_ID = 'commentId',
  CREATED_AT = 'createdAt',
}
