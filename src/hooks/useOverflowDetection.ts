import { RefObject, useEffect, useRef, useState } from 'react';

const useOverflowDetection = (
  content: string
): { isOverflowing: boolean; contentRef: RefObject<HTMLDivElement> } => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = contentRef.current;
    if (element) {
      setIsOverflowing(element.scrollHeight > element.clientHeight);
    }
  }, [content]);

  return { isOverflowing, contentRef };
};

export default useOverflowDetection;
