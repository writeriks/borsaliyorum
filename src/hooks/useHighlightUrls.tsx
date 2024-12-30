import { urlRegex } from '@/utils/api-utils/api-utils';
import { useEffect } from 'react';

export const useHighlightUrls = (content: string): void => {
  useEffect(() => {
    function highlightUrls(element: HTMLElement): void {
      if (!element) return;

      const text = element.textContent || '';

      const isElementAUrl = urlRegex.test(text);
      if (isElementAUrl) {
        element.style.visibility = 'visible';
      }
      const htmlWithHighlightedUrls = text.replace(urlRegex, url => {
        return `<strong class='bg-slate-700' style="font-weight: inherit;">${url}</strong>`;
      });

      // Update the element's innerHTML with the processed content
      element.innerHTML = htmlWithHighlightedUrls;
    }

    // Get mention elements
    const elements = document.querySelectorAll(
      '.mentions__highlighter__substring'
    ) as NodeListOf<HTMLElement>;

    elements.forEach(element => {
      highlightUrls(element);
    });
  }, [content]);
};
