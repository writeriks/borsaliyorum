/**
 * Formats a date string into a readable format showing the time difference
 * between now and the given date, or the full date if over 30 days.
 *
 * @param date - The date string to be formatted (parsable by Date).
 * @returns Object with:
 * - displayTime: Human-readable time difference ('Az önce', 'x dakika önce', etc.).
 * - fullDate: Full date string in 'Day, Month Date, Year, Time' format.
 */
export const formatDate = (
  date: string
): {
  displayDate: string;
  fullDate: string;
} => {
  const now = Date.now();
  const time = new Date(date).getTime();
  const difference = now - time; // Difference in milliseconds

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;

  const datePart = new Date(time).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timePart = new Date(time).toLocaleTimeString('tr-TR', {
    hour: 'numeric',
    minute: 'numeric',
  });

  const fullDate = `${datePart},  ${timePart}`;

  // Define an array of conditions with the corresponding messages
  const timeFormats = [
    { limit: minute, message: 'Az önce' },
    { limit: hour, message: `${Math.floor(difference / minute)} dakika önce` },
    { limit: day, message: `${Math.floor(difference / hour)} saat önce` },
    { limit: week, message: `${Math.floor(difference / day)} gün önce` },
    { limit: month, message: `${Math.floor(difference / week)} hafta önce` },
    { limit: 12 * month, message: `${Math.floor(difference / month)} ay önce` },
  ];

  // Find the appropriate message based on the time difference
  const displayDate = timeFormats.find(({ limit }) => difference < limit)?.message || datePart;

  return {
    displayDate,
    fullDate,
  };
};
