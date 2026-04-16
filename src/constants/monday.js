export const BOARD_IDS = {
  CUSTOMERS:     "18400951947",
  LOCATIONS:     "18400965227",
  WORK_ORDERS:   "18402613691",
  EQUIPMENT:     "18403226725",
  TIME_ENTRIES:  "18406939306",
  EXPENSES:      "18406939432",
  INVOICE_ITEMS: "18403393439",
  MASTER_COSTS:  "18407330739",
};

export const GROUP_IDS = {
  CUSTOMERS_ACTIVE: "topics",
  LOCATIONS_ACTIVE: "topics",
  EQUIPMENT_ACTIVE: "topics",
  TIME_ENTRIES_OPEN: "topics",
  EXPENSES_PENDING: "topics",
};

export const MONDAY_COLUMNS = {
  CUSTOMERS: {
    EMAIL: "email_mm0rhasv",
    PHONE: "phone_mm0rpam7",
    ACCOUNT_NUMBER: "text_mm0ryhr9",
    STATUS: "color_mm0rjkns",
    BILLING_ADDRESS: "long_text_mm0r9ndz",
    BILLING_TERMS: "dropdown_mm0r9ywe",
    XERO_CONTACT_ID: "text_mm0rdxmk",
    XERO_SYNC_STATUS: "color_mm0rxh2b",
    NOTES: "long_text_mm0rppk5",
    WORK_ORDERS_REL: "board_relation_mm2c58x9",
    LOCATIONS_REL: "board_relation_mm2c6xbt",
    OLD_LOCATIONS_REL: "board_relation_mm18ma0k",
    MASTER_COSTS: "board_relation_mm26rszz",
  },
  LOCATIONS: {
    STREET_ADDRESS: "text_mm0r64n",
    CITY: "text_mm0rv9zr",
    STATE: "dropdown_mm0r9ajj",
    ZIP: "text_mm0rrexv",
    STATUS: "color_mm0rrea",
    NOTES: "long_text_mm0rns1x",
    WORK_ORDERS_REL: "board_relation_mm2c3m20",
    CUSTOMERS_REL: "board_relation_mm2c2r5k",
    EQUIPMENTS_REL: "board_relation_mm2cf3hv",
  },
  WORK_ORDERS: {
    CUSTOMER:          "board_relation_mm2ctcg0",
    LOCATION:          "board_relation_mm2czk6k",
    DESCRIPTION:       "long_text_mm14ee7h",
    STATUS:            "color_mm14pf0q",         // Scheduling Status
    SCHEDULED_DATE:    "date_mm14sjdg",
    EXECUTION_STATUS:  "color_mm1s7ak1",         // Progress Status
    TECHNICIAN:        "multiple_person_mm14sesj",
    MULTI_DAY:         "boolean_mm14act2",
    BILLING_STAGE:     "color_mm2dgedg",         // Billing Stage
    SERVICE_HISTORY:   "long_text_mm15p7rk",
    WORK_PERFORMED:    "long_text_mm15kfzp",
    PHOTOS_DOCUMENTS:  "file_mm15n5d",           // Photos / Documents
    INVOICE_ITEMS_REL: "board_relation_mm1ady0r",
    PARTS_ORDERED:     "color_mm1bs0w7",
    WORKORDER_ID:      "text_mm1s82bz",
    MIRROR:            "lookup_mm2cbwnf",
    EQUIPMENTS_REL:    "board_relation_mm2cx2br",
    TIME_ENTRIES_REL:  "board_relation_mm2cnxb5",
    EXPENSES_REL:      "board_relation_mm2cgry0",
    DESCRIPTION_OLD:   "long_text_mm14ee7h",     // Alias for clarity
  },
  EQUIPMENT: {
    LOCATION: "board_relation_mm2c5c1q",
    CUSTOMERS_REL: "board_relation_mm2c6s8m",
    CUSTOMER_MIRROR: "lookup_mm19dq9a",
    MANUFACTURER: "text_mm19e8jk",
    MODEL_NUMBER: "text_mm19j9gf",
    SERIAL_NUMBER: "text_mm19epvj",
    INSTALL_DATE: "date_mm19k1md",
    STATUS: "color_mm19my9y",
    NOTES: "long_text_mm1915x3",
    WORK_ORDERS_REL: "board_relation_mm2cbp4g",
    SERVICE_HISTORY: "lookup_mm19r6xz",
    LAST_SERVICE_DATE: "lookup_mm19zknx",
  },
  TIME_ENTRIES: {
    TOTAL_HOURS: "numeric_mm21p49k",
    CLOCK_IN: "date_mm21zkpj",
    CLOCK_OUT: "date_mm2155gg",
    TASK_TYPE: "dropdown_mm21wscp",
    WORK_ORDERS_REL: "board_relation_mm21aenv",
    TECHNICIANS: "multiple_person_mm21m56s",
    LOCATIONS_REL: "board_relation_mm21vtd1",
    EXPENSES_ADDED: "boolean_mm212dcy",
  },
  EXPENSES: {
    TECHNICIAN:    "multiple_person_mm212yhb",
    TIME_ENTRY_REL:"board_relation_mm2cdgz8",  // Link to Time Entries board
    WORK_ORDER_REL:"board_relation_mm2cw5x5",  // Link to Work Orders board (board_relation, not text)
    RECEIPT:       "file_mm21j7d7",
    DESCRIPTION:   "text_mm213m15",
    EXPENSE_TYPE:  "dropdown_mm215jhc",
    AMOUNT:        "numeric_mm21a0kv",
  },
  INVOICE_ITEMS: {
    WORK_ORDERS_REL: "board_relation_mm1ae4as",
    CUSTOMER_MIRROR: "lookup_mm1ag56m",
    LOCATION_MIRROR: "lookup_mm1ac07c",
    ITEM_TYPE: "dropdown_mm1ae5fd",
    QUANTITY: "numeric_mm1ab4nj",
    UNIT_PRICE: "numeric_mm1a6h84",
    TOTAL: "formula_mm1astxs",
    BILLING_STATUS: "color_mm1ae7q7",
    INVOICE_ID: "text_mm1ay1cy",
    DESCRIPTION: "long_text_mm1cdk36",
    REVENUE_ACCOUNT: "color_mm1csz5m",
  },
  MASTER_COSTS: {
    WORK_ORDERS_REL:  "board_relation_mm26prz0",  // Link to Work Orders
    TECHNICIANS_REL:  "board_relation_mm26z5dh",  // Link to Technicians
    TYPE:             "color_mm25xk4h",            // Labor | Parts | Expense
    QUANTITY:         "numeric_mm256yw2",
    RATE:             "numeric_mm25xvx0",
    DESCRIPTION:      "text_mm25nhbc",
    TOTAL_COST:       "numeric_mm25953b",
    DATE:             "date_mm26snwa",
    INVOICE_STATUS:   "color_mm26qn4h",
  },
  TECHNICIANS: {
    STATUS:          "color_mm0w8tnj",
    POSITION:        "dropdown_mm0w3f6c",
    PHONE:           "phone_mm0w2yzw",
    EMAIL:           "email_mm0w15ry",
    HOURLY_RATE:     "numeric_mm0wgqn1",
    EMPLOYEE_ID:     "text_mm0wb6v3",
    NOTES:           "long_text_mm0wa2d8",
    WORK_ORDERS_REL: "board_relation_mm0wbc5",
    HOURS_REL:       "board_relation_mm0wm97w",
    EXPENSES_REL:    "board_relation_mm0xz48z",
  },
};

export const MONDAY_COLUMN_IDS = MONDAY_COLUMNS;
