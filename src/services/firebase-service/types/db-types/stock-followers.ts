import { StockId } from "@/services/firebase-service/types/db-types/stock";
import { UserId } from "@/services/firebase-service/types/db-types/user";
import { Timestamp } from "firebase/firestore";

export interface StockFollowers {
  followerId: UserId;
  stockId: StockId;
  followedAt: Timestamp;
  isNotified: boolean;
}

export enum StockFollowersEnum {
  FOLLOWER_ID = "followerId",
  STOCK_ID = "stockId",
  FOLLOWED_AT = "followedAt",
  IS_NOTIFIED = "isNotified",
}
