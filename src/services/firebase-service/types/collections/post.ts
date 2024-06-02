import { CommentsCollection } from "@/services/firebase-service/types/collections/comments";
import { LikesCollection } from "@/services/firebase-service/types/collections/likes";
import { StockId } from "@/services/firebase-service/types/collections/stock";
import { UserId } from "@/services/firebase-service/types/collections/user";
import { Timestamp } from "firebase/firestore";

export type PostId = string;

export type MediaData = {
  src: string;
  alt: string;
};

export type MediaPreview = (MediaData & {
  id: number;
})[];

export interface Post {
  postId: PostId;
  userId: UserId;
  stockTicker: StockId;
  likesCount: number;
  commentsCount: number;
  likes: LikesCollection | null;
  comments: CommentsCollection | null;
  media: MediaPreview | null;
  content: string;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isPositiveSentiment: boolean;
}

export enum PostsCollectionEnum {
  POST_ID = "postId",
  USER_ID = "userId",
  STOCK_TICKER = "stockTicker",
  LIKES_COUNT = "likesCount",
  COMMENTS_COUNT = "commentsCount",
  LIKES = "likes",
  COMMENTS = "comments",
  MEDIA = "media",
  CONTENT = "content",
  TAGS = "tags",
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  IS_POSITIVE_SENTIMENT = "isPositiveSentiment",
}
