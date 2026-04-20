export const SCHEDULING_STATUS_OPTIONS = [
  "Incomplete",
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
  "Additional Trip Needed (Time Only)",
  "Completed",
];

export const STATUS_OPTIONS = [
  ...SCHEDULING_STATUS_OPTIONS,
  ...PROGRESS_STATUS_OPTIONS,
];

export const STATUS_COLORS = {
  Incomplete: "error",
  Unscheduled: "warning",
  Scheduled: "primary",
  "Pre-scheduled": "secondary",
  "Return Trip Unscheduled": "warning",
  "Return Trip Scheduled": "info",
  "In Progress": "secondary",
  "Additional Trip Needed (parts ordered)": "warning",
  "Additional Trip Needed (need parts)": "error",
  "Additional Trip Needed (Time Only)": "secondary",
  Completed: "success",
};

export const STATUS_HEX = {
  Incomplete: "#7f5347",
  Unscheduled: "#ffcb00",
  Scheduled: "#ff6d3b",
  "Pre-scheduled": "#007eb5",
  "Return Trip Unscheduled": "#00c875",
  "Return Trip Scheduled": "#ff007f",
  "In Progress": "#fdab3d",
  "Additional Trip Needed (parts ordered)": "#007eb5",
  "Additional Trip Needed (need parts)": "#9d50dd",
  "Additional Trip Needed (Time Only)": "#037f4c",
  Completed: "#df2f4a",
};

export const PARTS_HEX = {
  "Waiting on Parts": "#fdab3d",
  Yes: "#00c875",
  No: "#df2f4a",
};

export const BILLING_STAGE_OPTIONS = [
  "Not Ready",
  "Ready for Billing",
  "Sent to Xero",
  "Paid",
];

export const BILLING_STAGE_HEX = {
  "Not Ready": "#9b9a97",
  "Ready for Billing": "#f59e0b",
  "Sent to Xero": "#4f8ef7",
  Paid: "#22c55e",
};

export const COST_TYPE_OPTIONS = ["Labor", "Parts", "Expense"];

export const COST_TYPE_HEX = {
  Labor: "#4f8ef7",
  Parts: "#a855f7",
  Expense: "#f59e0b",
};

export const ENTRY_TYPE_HEX = {
  Job: "#1a6ef7",
  Travel: "#a855f7",
  "Non-Job": "#f59e0b",
};
