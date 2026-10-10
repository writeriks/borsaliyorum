import { MultipleNotificationsWithUserPostAndCommentType } from '@/components/user-notifications/user-notifications-schema';
import { NotificationType } from '@prisma/client';

class NotificationService {
  /**
   * Generates a notification text for like events on posts or comments.
   *
   * @param notification - An array of notifications containing information about the liked post or comment.
   * @param displayName - The display name of the user who liked the post or comment.
   * @param t - A translation function to generate the notification text.
   * @returns A string containing the notification text, or undefined if the notification does not match expected types.
   */
  getLikeNotificationText = (
    notification: MultipleNotificationsWithUserPostAndCommentType,
    displayName: string,
    t: any
  ): string | undefined => {
    if (notification[0].postId && notification[0].commentId) {
      return notification.length > 1
        ? t('likedCommentMultiple', {
            userDisplayName: displayName,
            count: notification.length - 1,
          })
        : t('likedCommentSingle', { userDisplayName: displayName });
    } else if (notification[0].postId) {
      return notification.length > 1
        ? t('likedPostMultiple', { userDisplayName: displayName, count: notification.length - 1 })
        : t('likedPostSingle', { userDisplayName: displayName });
    }
  };

  /**
   * Generates a notification text for comments based on the number of notifications.
   *
   * @param notification - An object containing multiple notifications with user, post, and comment type information.
   * @param displayName - The display name of the user who made the comment.
   * @param t - A translation function to get the localized text.
   * @returns A string containing the notification text, or undefined if the notification length is not greater than 1.
   */
  getCommentNotificationText = (
    notification: MultipleNotificationsWithUserPostAndCommentType,
    displayName: string,
    t: any
  ): string | undefined => {
    return notification.length > 1
      ? t('commentedMultiple', { userDisplayName: displayName, count: notification.length - 1 })
      : t('commentedSingle', { userDisplayName: displayName });
  };

  /**
   * Generates a notification text for mentions in posts or comments.
   *
   * @param notification - An array of notifications containing post and comment information.
   * @param displayName - The display name of the user who mentioned.
   * @param t - A translation function to get the localized text.
   * @returns A string containing the notification text or undefined if no valid notification is found.
   */
  getMentionNotificationText = (
    notification: MultipleNotificationsWithUserPostAndCommentType,
    displayName: string,
    t: any
  ): string | undefined => {
    if (notification[0].postId && notification[0].commentId) {
      return notification.length > 1
        ? t('mentionedInCommentMultiple', {
            userDisplayName: displayName,
            count: notification.length - 1,
          })
        : t('mentionedInCommentSingle', { userDisplayName: displayName });
    } else if (notification[0].postId) {
      return notification.length > 1
        ? t('mentionedInPostMultiple', {
            userDisplayName: displayName,
            count: notification.length - 1,
          })
        : t('mentionedInPostSingle', { userDisplayName: displayName });
    }
  };

  handleNotificationClick = (
    notification: MultipleNotificationsWithUserPostAndCommentType,
    router: any
  ): void => {
    const notificationType = notification[0].type;

    switch (notificationType) {
      case NotificationType.FOLLOW:
        router.push(`/users/${notification[0].fromUser.username}`);
        break;
      case NotificationType.LIKE:
      case NotificationType.COMMENT:
      case NotificationType.MENTION:
        router.push(`/posts/${notification[0].postId}`);

      default:
        break;
    }
  };
}

const notificationService = new NotificationService();
export default notificationService;
