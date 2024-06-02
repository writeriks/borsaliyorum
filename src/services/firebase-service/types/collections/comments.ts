import {
  Post,
  PostId,
} from "@/services/firebase-service/types/collections/post";

export interface CommentsCollection {
  parentId: PostId;
  comments: Omit<Post, "isPositiveSentiment" | "stockTicker">[];
}

export enum CommentsCollectionEnum {
  PARENT_ID = "parentId",
  COMMENTS = "comments",
}
