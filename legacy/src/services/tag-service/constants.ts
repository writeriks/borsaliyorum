import { Stock, Tag } from '@prisma/client';

export const FOUR_HOURS = 14400000;
export const TWO_HOURS = 7200000;

export interface TrendingTopicsType {
  mostActiveStocks: Stock[];
  mostActiveTags: Tag[];
}
