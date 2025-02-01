import { z } from 'zod';

const User = z.object({
  username: z.string(),
  firebaseUserId: z.string(),
  displayName: z.string(),
  profilePhoto: z.union([z.string().nullable(), z.null()]),
});

const Post = z.object({
  postId: z.number(),
  content: z.string(),
  createdAt: z.date(),
});

const Comment = z.object({
  commentId: z.number(),
  content: z.string(),
  createdAt: z.date(),
});

const NotificationWithUserPostAndComment = z.object({
  notificationId: z.number(),
  userId: z.number(),
  fromUserId: z.number(),
  type: z.enum(['LIKE', 'FOLLOW', 'MENTION', 'COMMENT']),
  content: z.string(),
  read: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  postId: z.union([z.number(), z.null()]),
  commentId: z.union([z.number(), z.null()]),
  post: z.union([Post.nullish(), Post.optional()]),
  comment: z.union([Comment.nullish(), Comment.optional()]),
  fromUser: User,
});

const MultipleNotificationsWithUserPostAndComment = z.array(NotificationWithUserPostAndComment);

export type MultipleNotificationsWithUserPostAndCommentType =
  (typeof MultipleNotificationsWithUserPostAndComment)['_type'];

export const GroupedNotificationsResponse = z.array(z.array(NotificationWithUserPostAndComment));
export type GroupedNotificationsResponseType = (typeof GroupedNotificationsResponse)['_type'];

export type NotificationResponse = {
  lastNotificationId: number;
  notifications: GroupedNotificationsResponseType;
};
