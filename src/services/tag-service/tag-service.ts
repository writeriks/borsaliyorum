import { TagsEnum } from '@/services/firebase-service/types/db-types/tag';
import prisma from '@/services/prisma-service/prisma-client';

import { Tag as DBTag } from '@prisma/client';

class TagService {
  /*
   * From given content, gets the cashtags, hashtags and mentions
   * @param content - The content to get tags from
   *
   * @returns The cashtags, hashtags and mentions
   */
  getTagsFromContent = (
    content: string
  ): { cashtags: string[]; hashtags: string[]; mentions: string[] } => {
    const cashtags: string[] = [];
    const hashtags: string[] = [];
    const mentions: string[] = [];

    // Regex to match cashtags, hashtags and mentions
    const regex = /(\$\((.*?)\)|#\((.*?)\)|@\((.*?)\))/g;

    content.split('\n').forEach(line => {
      const matches = [...line.matchAll(regex)];

      matches.forEach(async match => {
        const [fullMatch, _, p2, p3, p4] = match;

        const symbol = fullMatch[0];
        const tagName = symbol + (p2 || p3 || p4);

        switch (this.getTagType(symbol)) {
          case TagsEnum.CASHTAG:
            cashtags.push(tagName);
            break;
          case TagsEnum.HASHTAG:
            hashtags.push(tagName);
            break;
          case TagsEnum.MENTION:
            mentions.push(tagName);
            break;
        }
      });
    });

    return { cashtags, hashtags, mentions };
  };

  /*
   * Checks given tags in the database and creates the ones that do not exist
   * @param hashtags - The hashtags to check and create
   *
   * @returns The created tags
   */
  createHashtags = async (hashtags: string[]): Promise<DBTag[]> => {
    const existingTags = await prisma.tag.findMany({
      where: {
        tagName: {
          in: hashtags,
        },
      },
    });

    const existingTagNames = existingTags.map(tag => tag.tagName);
    const newTagNames = hashtags.filter(tagName => !existingTagNames.includes(tagName));

    const newTags = await Promise.all(
      newTagNames.map(tagName =>
        prisma.tag.create({
          data: {
            tagName,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      )
    );

    const updatedExistingTags = await Promise.all(
      existingTags.map(tag =>
        prisma.tag.update({
          where: {
            tagId: tag.tagId,
          },
          data: {
            updatedAt: new Date(),
          },
        })
      )
    );

    return [...updatedExistingTags, ...newTags];
  };

  /*
   * Get the type of tag
   *
   * @param symbol - The symbol of the tag
   */
  private getTagType = (symbol: string): TagsEnum => {
    switch (symbol) {
      case TagsEnum.CASHTAG:
        return TagsEnum.CASHTAG;
      case TagsEnum.MENTION:
        return TagsEnum.MENTION;
      case TagsEnum.HASHTAG:
      default:
        return TagsEnum.HASHTAG;
    }
  };

  /*
   * Navigate to page by tag name
   *
   * @param tag - The tag to navigate to
   * @param router - The router instance
   */
  navigateToPageByTagName = (tag: string, router: any): void => {
    const tagType = tag[0];

    switch (tagType) {
      case TagsEnum.CASHTAG:
        router.push(`/stocks/${tag}`);
        break;
      case TagsEnum.MENTION:
        router.push(`/users/${tag.replace(TagsEnum.MENTION, '')}`);
        break;
      case TagsEnum.HASHTAG:
      default:
        router.push(`/tags/${tag.replace(TagsEnum.HASHTAG, '')}`);
        break;
    }
  };
}

const tagService = new TagService();
export default tagService;
