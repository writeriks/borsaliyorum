import { PostId } from "@/services/firebase-service/types/collections/post";
import { UserId } from "@/services/firebase-service/types/collections/user";
import { Timestamp } from "firebase/firestore";

export interface CommentsCollection {
  postId: PostId;
  comments: Comment[];
}

export interface Comment {
  commentedBy: UserId;
  content: string;
  createdAt: Timestamp;
}

export enum CommentsCollectionEnum {
  USER_ID = "userId",
  CONTENT = "content",
  CREATED_AT = "createdAt",
}

export enum CommentEnum {
  COMMENTED_BY = "commentedBy",
  CONTENT = "content",
  CREATED_AT = "createdAt",
}
