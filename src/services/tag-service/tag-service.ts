import firebaseGenericOperations from '@/services/firebase-service/firebase-generic-operations';
import { WhereFieldEnum } from '@/services/firebase-service/firebase-operations-types';
import { CollectionPath } from '@/services/firebase-service/types/collection-types';
import { Tag, TagsCollectionEnum, TagsEnum } from '@/services/firebase-service/types/db-types/tag';
import { FirebaseSnapshot } from '@/services/firebase-service/types/types';
import { isWithinXHoursFromNow } from '@/services/util-service/util-service';

class TagService {
  /*
   * From given content, gets the cashtags and hashtags
   * and creates tags or updates existing tags for them
   *
   * @param post - The post to create tags for
   */
  createTag = async (content: string): Promise<void> => {
    const regex = /(\$\((.*?)\)|#\((.*?)\)|@\((.*?)\))/g;
    content.split('\n').forEach(line => {
      const matches = [...line.matchAll(regex)];

      matches.forEach(async match => {
        const [fullMatch, _, p2, p3, p4] = match;

        const symbol = fullMatch[0];
        const tagName = symbol + (p2 || p3 || p4);

        if (this.getTagType(symbol) === TagsEnum.MENTION) {
          // TODO: Handle Mentions
          return;
        }

        const { lastDocument } = await firebaseGenericOperations.getDocumentsWithQuery({
          collectionPath: CollectionPath.Tags,
          whereFields: [
            {
              field: TagsCollectionEnum.TAG_ID,
              operator: WhereFieldEnum.EQUALS,
              value: tagName,
            },
          ],
        });

        if (!lastDocument) {
          await this.createNewTag(tagName);
        } else {
          await this.updateExistingTag(lastDocument);
        }
      });
    });
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
   * Creates a new tag with post count and last post date
   * If the tag already exists, increments the post count and updates the last post date
   *
   * @param tagName - The name of the tag
   */
  private createNewTag = async (tagName: string): Promise<void> => {
    const newTag: Tag = {
      tagId: tagName,
      totalPostCount: 1,
      postCountInLastFourHours: 1,
      createdAt: Date.now(),
      lastPostDate: Date.now(),
      type: this.getTagType(tagName[0]),
    };
    await firebaseGenericOperations.createDocumentWithAutoId(CollectionPath.Tags, newTag);
  };

  /*
   * Updates existing tag with new post count and last post date
   * If the last post date is within the last four hours, increments the post count in the last four hours
   *
   * @param tagDocument - The tag document to update
   */
  private updateExistingTag = async (tagDocument: FirebaseSnapshot): Promise<void> => {
    const tag = tagDocument.data() as Tag;
    const postCountInLastFourHours = isWithinXHoursFromNow(tag.lastPostDate, 4)
      ? tag.postCountInLastFourHours + 1
      : 1;

    const updatedTag: Tag = {
      ...tag,
      totalPostCount: tag.totalPostCount + 1,
      postCountInLastFourHours,
      lastPostDate: Date.now(),
    };

    await firebaseGenericOperations.updateDocumentById(
      CollectionPath.Tags,
      tagDocument.id,
      updatedTag
    );
  };
}

const tagService = new TagService();
export default tagService;