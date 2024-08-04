import { PostId } from '@/services/firebase-service/types/db-types/post';

import { UserId } from '@/services/firebase-service/types/db-types/user';

export interface PostLikes {
  userId: UserId;
  postId: PostId;
  likedAt: number;
}

export enum PostLikesEnum {
  POST_ID = 'postId',
  USER_ID = 'userId',
  LIKED_AT = 'likedAt',
}
