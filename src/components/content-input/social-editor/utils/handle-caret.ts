// Caret position utilities
export const getCaretPosition = (element: HTMLElement): number => {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return 0;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  return preCaretRange.toString().length;
};

export const setCaretPosition = (element: HTMLElement, position: number): void => {
  const range = document.createRange();
  const selection = window.getSelection();
  if (!selection) return;

  const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

  let currentPos = 0;
  let targetNode: Node | null = null;
  let targetOffset = 0;

  let node: Node | null;
  while ((node = walk.nextNode())) {
    const nodeLength = node.textContent?.length || 0;
    if (currentPos + nodeLength >= position) {
      targetNode = node;
      targetOffset = position - currentPos;
      break;
    }
    currentPos += nodeLength;
  }

  if (targetNode) {
    range.setStart(targetNode, targetOffset);
    range.setEnd(targetNode, targetOffset);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};
