import {
  MediaData,
  PostId,
} from "@/services/firebase-service/types/db-types/post";
import { Timestamp } from "firebase/firestore";

export type CommentId = string;

export interface Comment {
  commentId: CommentId;
  postId: PostId;
  likeCount: number;
  media: MediaData | null;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum CommentsCollectionEnum {
  COMMENT_ID = "commentId",
  POST_ID = "postId",
  LIKE_COUNT = "likeCount",
  MEDIA = "media",
  CONTENT = "content",
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
}
