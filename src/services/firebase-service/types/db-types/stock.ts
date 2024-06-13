import { PostId } from "@/services/firebase-service/types/db-types/post";
import { Timestamp } from "firebase/firestore";

export type StockId = string;

// Stocks Main Collection
export interface StocksCollection {
  stockId: StockId;
  ticker: StockId;
  postCount: number;
  fullName: string;
  coverPhoto: string | null;
  positiveSentiment: number;
  marketEnterDate: Timestamp;
}

export enum StocksCollectionEnum {
  STOCK_ID = "stockId",
  TICKER = "ticker",
  POSTS_COUNT = "postCount",
  FULL_NAME = "fullName",
  COVER_PHOTO = "coverPhoto",
  POSITIVE_SENTIMENT = "positiveSentiment",
  MARKET_ENTER_DATE = "marketEnterDate",
}
