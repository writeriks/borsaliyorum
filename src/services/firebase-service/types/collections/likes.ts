import { PostId } from "@/services/firebase-service/types/collections/post";
import { UserId } from "@/services/firebase-service/types/collections/user";
import { Timestamp } from "firebase/firestore";

export interface LikesCollection {
  postId: PostId;
  likes: Like[];
}

export interface Like {
  likedBy: UserId;
  createdAt: Timestamp;
}

export enum LikeEnum {
  LIKED_BY = "liked_by",
  CREATED_AT = "createdAt",
}
export enum LikesCollectionEnum {
  POST_ID = "postId",
  LIKES = "likes",
}
