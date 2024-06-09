import { PostCommentsCollection } from "@/services/firebase-service/types/collections/comments";
import { PostLikesCollection } from "@/services/firebase-service/types/collections/likes";
import { StockId } from "@/services/firebase-service/types/collections/stock";
import { Tag } from "@/services/firebase-service/types/collections/tag";
import { UserId } from "@/services/firebase-service/types/collections/user";
import { Timestamp } from "firebase/firestore";

// Post Main Collection
export type PostCollection = Post[];

export type PostId = string;

export interface Post {
  postId: PostId;
  userId: UserId;
  stockTickers: StockId[];
  likesCount: number;
  likes: PostLikesCollection | null;
  commentsCount: number;
  comments: PostCommentsCollection | null;
  media: MediaPreview | null;
  content: string;
  tags: Tag[];
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
