import { PostId } from "@/services/firebase-service/types/collections/post";
import { Timestamp } from "firebase/firestore";

export type StockId = string;

// Stocks Main Collection
export interface StocksCollection {
  stockId: StockId;
  ticker: StockId;
  posts: PostId[];
  postsCount: number;
  fullName: string;
  description: string;
  currentPrice: number | null;
  marketCap: number;
  createdAt: Timestamp;
  coverPhoto: string | null;
  positiveSentiment: number;
}

export enum StocksCollectionEnum {
  STOCK_ID = "stockId",
  TICKER = "ticker",
  POSTS = "posts",
  POSTS_COUNT = "postsCount",
  FULL_NAME = "fullName",
  DESCRIPTION = "description",
  CURRENT_PRICE = "currentPrice",
  MARKET_CAP = "marketCap",
  CREATED_AT = "createdAt",
  COVER_PHOTO = "coverPhoto",
  POSITIVE_SENTIMENT = "positiveSentiment",
}
