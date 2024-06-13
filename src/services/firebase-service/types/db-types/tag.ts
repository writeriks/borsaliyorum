import { PostId } from "@/services/firebase-service/types/db-types/post";
import { Timestamp } from "firebase/firestore";

export type TagId = string;

// Tag Main Collection
export type TagsCollection = Tag[];

export interface Tag {
  tagId: TagId;
  name: string;
  postIds: PostId[]; // ????
  postCount: number;
  createdAt: Timestamp;
}

export enum TagsCollectionEnum {
  TAG_ID = "tagId",
  NAME = "name",
  POST_IDS = "postIds", // ???
  POST_COUNT = "postCount",
  CREATED_AT = "createdAt",
}
