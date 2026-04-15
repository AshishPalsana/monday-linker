export const SCHEDULING_STATUS_OPTIONS = [
  "Incomplete (needs details)",
  "Unscheduled",
  "Scheduled",
  "Pre-scheduled",
  "Return Trip Unscheduled",
  "Return Trip Scheduled",
];

export const PROGRESS_STATUS_OPTIONS = [
  "In Progress",
  "Additional Trip Needed (parts ordered)",
  "Additional Trip Needed (need parts)",
  "addl trip needed time only",
  "Complete",
];

// Combine for backward compatibility or general lists
export const STATUS_OPTIONS = [
  ...SCHEDULING_STATUS_OPTIONS,
  ...PROGRESS_STATUS_OPTIONS,
];

export const STATUS_COLORS = {
  "Incomplete (needs details)": "error",
  Unscheduled: "warning",
  Scheduled: "primary",
  "Pre-scheduled": "secondary",
  "Return Trip Unscheduled": "warning",
  "Return Trip Scheduled": "info",
  "In Progress": "secondary",
  "Additional Trip Needed (parts ordered)": "warning",
  "Additional Trip Needed (need parts)": "error",
  "addl trip needed time only": "secondary",
  Complete: "success",
};

export const STATUS_HEX = {
  "Incomplete (needs details)": "#ef4444",
  Unscheduled: "#f59e0b",
  Scheduled: "#4f8ef7",
  "Pre-scheduled": "#a855f7",
  "Return Trip Unscheduled": "#f97316",
  "Return Trip Scheduled": "#06b6d4",
  "In Progress": "#a855f7",
  "Additional Trip Needed (parts ordered)": "#f59e0b",
  "Additional Trip Needed (need parts)": "#ef4444",
  "addl trip needed time only": "#a855f7",
  Complete: "#22c55e",
};

export const PARTS_ORDERED_OPTIONS = [
  "Not Required",
  "Pending",
  "Ordered",
  "Received",
  "Installed",
];

export const PARTS_HEX = {
  "Not Required": "#6b7280",
  Pending: "#f59e0b",
  Ordered: "#4f8ef7",
  Received: "#22c55e",
  Installed: "#a855f7",
};

