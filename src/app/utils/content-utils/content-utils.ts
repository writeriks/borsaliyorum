/**
 * Formats a date string into a readable format showing the time difference
 * between now and the given date, or the full date if over 30 days.
 *
 * @param postDate - The date string to be formatted (parsable by Date).
 * @returns Object with:
 * - displayTime: Human-readable time difference ('Az önce', 'x dakika önce', etc.).
 * - fullDate: Full date string in 'Day, Month Date, Year, Time' format.
 */
export const formatDate = (
  postDate: string
): {
  displayDate: string;
  fullDate: string;
} => {
  const now = Date.now();
  const postTime = new Date(postDate).getTime();
  const difference = now - postTime; // Difference in milliseconds

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;

  let displayDate = '';
  const datePart = new Date(postTime).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timePart = new Date(postTime).toLocaleTimeString('tr-TR', {
    hour: 'numeric',
    minute: 'numeric',
  });

  const fullDate = `${datePart},  ${timePart}`;

  if (difference < minute) {
    displayDate = 'Az önce';
  } else if (difference < hour) {
    const minutesAgo = Math.floor(difference / minute);
    displayDate = `${minutesAgo} dakika önce`;
  } else if (difference < day) {
    const hoursAgo = Math.floor(difference / hour);
    displayDate = `${hoursAgo} saat önce`;
  } else if (difference < week) {
    const daysAgo = Math.floor(difference / day);
    displayDate = `${daysAgo} gün önce`;
  } else if (difference < month) {
    const weeksAgo = Math.floor(difference / week);
    displayDate = `${weeksAgo} hafta önce`;
  } else if (difference < 12 * month) {
    const monthsAgo = Math.floor(difference / month);
    displayDate = `${monthsAgo} ay önce`;
  } else {
    displayDate = datePart;
  }

  return {
    displayDate,
    fullDate,
  };
};
