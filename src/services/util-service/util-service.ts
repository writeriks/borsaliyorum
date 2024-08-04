/*
 * Returns true if a date is within a certain number of hours from now.
 *  @param date - The date to compare.
 * @param hours - The number of hours to compare.
 * @returns True if the date is within the specified number of hours from now.
 */
export const isWithinXHoursFromNow = (date: number, hours: number): boolean => {
  return date > Date.now() - hours * 60 * 60 * 1000;
};
