export const isValidUsername = (username: string): boolean => {
  // username validation only letters, number, underscore _ and length check between 3-20 char
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

export const isValidEmail = (email: string): boolean => {
  // email validation and length check between 1-120 char
  const emailRegex = /(?=^.{1,120}$)^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
  return emailRegex.test(email);
};

export const isValidDisplayName = (displayName: string): boolean => {
  // display name length check
  return displayName.length < 80 && displayName.length > 3;
};
