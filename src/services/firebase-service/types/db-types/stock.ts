import { PostId } from '@/services/firebase-service/types/db-types/post';

export type StockId = string;

export type StockCollection = Stock[];

export enum StockType {
  STOCK = 'stock',
  CRYPTO = 'crypto',
}
export interface Stock {
  stockId: StockId;
  postIds: PostId[];
  ticker: StockId;
  postCount: number;
  companyName: string;
  coverPhoto: string | null;
  positiveSentiment: number;
  marketEnterDate: number;
  stockType: StockType;
}

export enum StocksCollectionEnum {
  STOCK_ID = 'stockId',
  POST_IDS = 'postIds',
  TICKER = 'ticker',
  POSTS_COUNT = 'postCount',
  COMPANY_NAME = 'companyName',
  COVER_PHOTO = 'coverPhoto',
  POSITIVE_SENTIMENT = 'positiveSentiment',
  MARKET_ENTER_DATE = 'marketEnterDate',
}
