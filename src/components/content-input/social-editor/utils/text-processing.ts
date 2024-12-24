// Text processing utilities
export const convertUrlsToLinks = (text: string): string => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(
    urlRegex,
    '<a href="$1" class="text-blue-500 hover:underline" target="_blank">$1</a>'
  );
};

export const styleMentions = (text: string): string => {
  // Capture the entire mention including @ symbol
  const mentionRegex = /(@[\w\s]+)(?=\s|$)/g;
  const hashtagRegex = /(#[\w]+)/g;
  const cashtagRegex = /(\$[\w]+)/g;

  return text
    .replace(mentionRegex, '<span class="text-blue-500">$1</span>')
    .replace(hashtagRegex, '<span class="text-blue-500">$1</span>')
    .replace(cashtagRegex, '<span class="text-blue-500">$1</span>');
};
