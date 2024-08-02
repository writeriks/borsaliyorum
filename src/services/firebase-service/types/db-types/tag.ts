import { Timestamp } from 'firebase/firestore';

export type TagId = string;

// Tag Main Collection
export type TagsCollection = Tag[];

export interface Tag {
  tagId: TagId;
  totalPostCount: number;
  postCountInLastFourHours: number;
  createdAt: Timestamp;
  lastPostDate: Timestamp;
  type: TagsEnum;
}

export enum TagsCollectionEnum {
  TAG_ID = 'tagId',
  POST_COUNT = 'totalPostCount',
  POST_COUNT_IN_LAST_FOUR_HOURS = 'postCountInLastFourHours',
  LAST_POST_DATE = 'lastPostDate',
  CREATED_AT = 'createdAt',
  TYPE = 'type',
}

export enum TagsEnum {
  HASHTAG = '#',
  CASHTAG = '$',
  MENTION = '@',
}
