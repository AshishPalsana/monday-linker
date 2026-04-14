export const STATUS_OPTIONS = [
  "Unscheduled",
  "Scheduled",
  "In Progress",
  "Parts Needed",
  "Active",
  "Completed",
  "Cancelled",
  "Incomplete",
  "Pre-scheduled",
  "Return Trip Unscheduled",
  "Return Trip Scheduled",
  "Additional Trip Needed (Parts Ordered)",
  "Additional Trip Needed (Need Parts)",
  "Additional Trip Needed (Time Only)",
];

export const PARTS_ORDERED_OPTIONS = [
  "Not Required",
  "Pending",
  "Ordered",
  "Received",
  "Installed",
];

export const STATUS_COLORS = {
  Unscheduled: "warning",
  "Parts Needed": "error",
  Active: "success",
  Scheduled: "primary",
  Completed: "default",
  "In Progress": "secondary",
  Cancelled: "default",
  Incomplete: "error",
  "Pre-scheduled": "secondary",
  "Return Trip Unscheduled": "warning",
  "Return Trip Scheduled": "info",
  "Additional Trip Needed (Parts Ordered)": "warning",
  "Additional Trip Needed (Need Parts)": "error",
  "Additional Trip Needed (Time Only)": "secondary",
};

export const STATUS_HEX = {
  Unscheduled: "#f59e0b",
  "Parts Needed": "#ef4444",
  Active: "#22c55e",
  Scheduled: "#4f8ef7",
  Completed: "#6b7280",
  "In Progress": "#a855f7",
  Cancelled: "#6b7280",
  Incomplete: "#ef4444",
  "Pre-scheduled": "#a855f7",
  "Return Trip Unscheduled": "#f97316",
  "Return Trip Scheduled": "#06b6d4",
  "Additional Trip Needed (Parts Ordered)": "#f59e0b",
  "Additional Trip Needed (Need Parts)": "#ef4444",
  "Additional Trip Needed (Time Only)": "#a855f7",
};

export const PARTS_HEX = {
  "Not Required": "#6b7280",
  Pending: "#f59e0b",
  Ordered: "#4f8ef7",
  Received: "#22c55e",
  Installed: "#a855f7",
};
