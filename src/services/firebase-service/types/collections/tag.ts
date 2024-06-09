import { Timestamp } from "firebase/firestore";

export type TagId = string;

// Tag Main Collection
export type TagsCollection = Tag[];

export interface Tag {
  tagId: TagId;
  name: string;
  postCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export enum TagsCollectionEnum {
  TAG_ID = "tagId",
  NAME = "name",
  POST_COUNT = "postCount",
  CREATED_AT = "createdAt",
  UPDATED_AT = "updatedAt",
}
