import { PostLikesCollection } from "@/services/firebase-service/types/collections/likes";
import {
  MediaPreview,
  PostId,
} from "@/services/firebase-service/types/collections/post";
import { Tag } from "@/services/firebase-service/types/collections/tag";
import { UserId } from "@/services/firebase-service/types/collections/user";
import { Timestamp } from "firebase/firestore";

export type CommentId = string;

// Sub collection under Post Collection
export interface PostCommentsCollection {
  parentId: PostId;
  comments: Comment[];
}

export interface Comment {
  commentId: CommentId;
  commentedBy: UserId;
  likesCount: number;
  likes: PostLikesCollection | null;
  media: MediaPreview | null;
  content: string;
  tags: Tag[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum PostCommentsCollectionEnum {
  PARENT_ID = "parentId",
  COMMENTS = "comments",
}

export enum CommentsCollectionEnum {
  COMMENT_ID = "commentId",
  COMMENTED_BY = "commentedBy",
  LIKES_COUNT = "likesCount",
  LIKES = "likes",
  MEDIA = "media",
  CONTENT = "content",
  TAGS = "tags",
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
}
