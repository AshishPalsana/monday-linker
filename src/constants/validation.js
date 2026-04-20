export const REQUIRED_CUSTOMER_FIELDS = [
  { key: "contactName", label: "Contact Name" },
  { key: "email", label: "Contact Email" },
  { key: "phone", label: "Contact Phone" },
  { key: "billingAddress", label: "Billing Address" },
];

export const REQUIRED_LOCATION_FIELDS = [
  { key: "streetAddress", label: "Street Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "ZIP Code" },
  { key: "phone", label: "Contact Phone" },
];
export const VALIDATION_STATUSES = {
  EXECUTION: [
    "In Progress",
    "Additional Trip Needed (parts ordered)",
    "Additional Trip Needed (need parts)",
    "Additional Trip Needed (Time Only)",
    "Completed",
  ],
  PARTS_ORDERED: ["Waiting on Parts", "Yes", "No"],
};
