import { Post } from '@prisma/client';

export const MAX_CHARACTERS = 1000;

export type ContentPreview = {
  title: string;
  description: string;
  image: string;
};

export interface LadingPagePost extends Post {
  likeCount: number;
  commentCount: number;
  user: {
    userId: number;
    displayName: string;
    username: string;
    profilePhoto: string;
  };
}
