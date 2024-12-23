class ContentHelper {
  /**
   * Extracts the first URL from a string if it exists.
   * @param input - The string to check.
   * @returns The first URL found, or null if no URL is present.
   */
  extractURL = (input: string): string | null => {
    const urlRegex =
      /\bhttps?:\/\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]+\.(com|org|net|io|edu|gov|mil|co|uk|us|info|biz|dev|ai|app|xyz)(\b|\/|$)/gi;
    const match = input.match(urlRegex);
    return match ? match[0] : null;
  };
}

const contentHelper = new ContentHelper();
export default contentHelper;
