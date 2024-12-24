export const findTriggerIndex = (text: string, position: number): number => {
  // Start from the cursor position and move backwards
  for (let i = position - 1; i >= 0; i--) {
    const char = text[i];

    // If we hit a space, stop searching for this trigger
    if (char === ' ') {
      break;
    }

    // If we find a trigger (@, #, $)
    if (['@', '#', '$'].includes(char)) {
      // Validate the trigger is not part of a word (e.g., ensure no space after the trigger up to `position`)
      const textAfterTrigger = text.slice(i + 1, position);

      if (!textAfterTrigger.includes(' ')) {
        return i;
      }
    }
  }

  // Return -1 if no valid trigger is found
  return -1;
};
