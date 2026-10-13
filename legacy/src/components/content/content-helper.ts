class ContentHelper {
  /**
   * Extracts the first URL from a string if it exists.
   * @param input - The string to check.
   * @returns The first URL found, or null if no URL is present.
   */
  extractURL = (input: string): string[] | null => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const match = input.match(urlRegex);
    return match ? match : null;
  };
}

const contentHelper = new ContentHelper();
export default contentHelper;
