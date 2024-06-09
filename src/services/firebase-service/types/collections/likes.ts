import { CommentId } from "@/services/firebase-service/types/collections/comments";
import { PostId } from "@/services/firebase-service/types/collections/post";
import { UserId } from "@/services/firebase-service/types/collections/user";
import { Timestamp } from "firebase/firestore";

// Sub collection under Post Collection
export interface PostLikesCollection {
  postId: PostId;
  likes: Like[];
}

// Sub collection under Comments Subcollection
export interface CommentLikesCollection {
  commentId: CommentId;
  likes: Like[];
}

export interface Like {
  likedBy: UserId;
  createdAt: Timestamp;
}

export enum PostLikesCollectionEnum {
  POST_ID = "postId",
  LIKES = "likes",
}

export enum CommentLikesCollectionEnum {
  POST_ID = "postId",
  LIKES = "likes",
}

export enum LikeEnum {
  LIKED_BY = "liked_by",
  CREATED_AT = "createdAt",
}
