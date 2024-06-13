import { PostCommentsCollection } from "@/services/firebase-service/types/db-types/comments";
import { PostLikesCollection } from "@/services/firebase-service/types/db-types/likes";
import { StockId } from "@/services/firebase-service/types/db-types/stock";
import { Tag } from "@/services/firebase-service/types/db-types/tag";
import { UserId } from "@/services/firebase-service/types/db-types/user";
import { Timestamp } from "firebase/firestore";

// Post Main Collection
export type PostCollection = Post[];

export type PostId = string;

export interface Post {
  postId: PostId;
  userId: UserId;
  stockTickers: StockId[];
  likeCount: number;
  commentCount: number;
  media: MediaPreview | null;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isPositiveSentiment: boolean;
}

export type MediaData = {
  src: string;
  alt: string;
};

export type MediaPreview = (MediaData & {
  id: number;
})[];

export enum PostsCollectionEnum {
  POST_ID = "postId",
  USER_ID = "userId",
  STOCK_TICKER = "stockTickers",
  LIKE_COUNT = "likeCount",
  COMMENT_COUNT = "commentCount",
  MEDIA = "media",
  CONTENT = "content",
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  IS_POSITIVE_SENTIMENT = "isPositiveSentiment",
}
