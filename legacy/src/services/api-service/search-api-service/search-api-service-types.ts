import { Stock, Tag, User } from '@prisma/client';

export interface SearchResponseType {
  stocks: Stock[];
  tags: {
    tag: Tag;
    postCount: number;
  }[];
  users: User[];
}
