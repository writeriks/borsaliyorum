import { PostId } from '@/services/firebase-service/types/db-types/post';

import { UserId } from '@/services/firebase-service/types/db-types/user';
import { Timestamp } from 'firebase/firestore';

export interface PostLikes {
  userId: UserId;
  postId: PostId;
  likedAt: Timestamp;
}

export enum PostLikesEnum {
  POST_ID = 'postId',
  USER_ID = 'userId',
  LIKED_AT = 'likedAt',
}
