import { StockId } from "@/services/firebase-service/types/db-types/stock";
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
  media: MediaData | null;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isPositiveSentiment: boolean;
}

export type MediaData = {
  src: string;
};

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
