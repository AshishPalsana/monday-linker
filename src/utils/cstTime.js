const TZ = "America/Chicago";

/** Returns today's date as "YYYY-MM-DD" in CST/CDT. */
export function getCSTDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Formats a Date (or ISO string) to a time string in CST/CDT. */
export function formatCSTTime(date, opts = {}) {
  return new Date(date).toLocaleTimeString("en-US", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  });
}

/** Formats a Date (or ISO string) to a date string in CST/CDT. */
export function formatCSTDate(date, opts = {}) {
  return new Date(date).toLocaleDateString("en-US", {
    timeZone: TZ,
    ...opts,
  });
}

/** Returns a new Date representing the start of the current week (Monday) in CST. */
export function getCSTWeekStart(fromDate) {
  const base = fromDate ? new Date(fromDate) : new Date();
  // Get the CST date string to find the current day-of-week in CST
  const cstDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(base);
  const cstDate = new Date(`${cstDateStr}T00:00:00`);
  const day = cstDate.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day;
  cstDate.setDate(cstDate.getDate() + diff);
  return cstDate;
}
