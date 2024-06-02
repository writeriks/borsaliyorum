export interface Tag {
  tagId: string;
  name: string;
  postsCount: number;
}

export enum TagsCollectionEnum {
  TAG_ID = "tagId",
  NAME = "name",
  POSTS_COUNT = "postsCount",
}
