/**
 * Time formatting utilities — uses the browser's local timezone automatically.
 * No hardcoded timezone: whatever the user's computer/browser is set to will be used.
 */

/** Returns today's date as "YYYY-MM-DD" in the browser's local timezone. */
export function getCSTDate() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

/** Formats a Date (or ISO string) to a time string in the browser's local timezone. */
export function formatCSTTime(date, opts = {}) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  });
}

/** Formats a Date (or ISO string) to a date string in the browser's local timezone. */
export function formatCSTDate(date, opts = {}) {
  return new Date(date).toLocaleDateString("en-US", {
    ...opts,
  });
}

/** Returns a new Date representing the start of the current week (Monday) in local timezone. */
export function getCSTWeekStart(fromDate) {
  const base = fromDate ? new Date(fromDate) : new Date();
  // Use local date string to find the current day-of-week in the browser's timezone
  const localDateStr = new Intl.DateTimeFormat("en-CA").format(base);
  const localDate = new Date(`${localDateStr}T00:00:00`);
  const day = localDate.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  localDate.setDate(localDate.getDate() + diff);
  return localDate;
}
