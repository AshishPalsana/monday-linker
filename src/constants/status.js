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

export const PARTS_HEX = {
  "Not Required": "#6b7280",
  Pending: "#f59e0b",
  Ordered: "#4f8ef7",
  Received: "#22c55e",
  Installed: "#a855f7",
};

export const BILLING_STAGE_OPTIONS = [
  "Not Ready",
  "Ready for Billing",
  "Sent to Xero",
  "Paid",
];

export const BILLING_STAGE_HEX = {
  "Not Ready":        "#9b9a97",
  "Ready for Billing":"#f59e0b",
  "Sent to Xero":     "#4f8ef7",
  Paid:               "#22c55e",
};

export const COST_TYPE_OPTIONS = ["Labor", "Parts", "Expense"];

export const COST_TYPE_HEX = {
  Labor:   "#4f8ef7",
  Parts:   "#a855f7",
  Expense: "#f59e0b",
};

export const ENTRY_TYPE_HEX = {
  Job:     "#1a6ef7",
  Travel:  "#a855f7",
  "Non-Job": "#f59e0b",
};
