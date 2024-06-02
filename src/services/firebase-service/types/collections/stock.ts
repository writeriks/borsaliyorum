import { Timestamp } from "firebase/firestore";

export type StockId = string;

export interface StocksCollection {
  stockId: StockId;
  ticker: StockId;
  name: string;
  description: string;
  currentPrice: number | null;
  marketCap: number;
  postsCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  coverPhoto: string | null;
  positiveSentiment: number;
}

export enum StocksCollectionEnum {
  STOCK_ID = "stockId",
  TICKER = "ticker",
  NAME = "name",
  DESCRIPTION = "description",
  CURRENT_PRICE = "currentPrice",
  MARKET_CAP = "marketCap",
  POSTS_COUNT = "postsCount",
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
  COVER_PHOTO = "coverPhoto",
  POSITIVE_SENTIMENT = "positiveSentiment",
}
