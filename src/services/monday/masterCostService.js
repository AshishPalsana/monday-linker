import { CREATE_ITEM, UPDATE_ITEM_COLUMNS } from "./mutations";
import { executeMutation } from "./baseService";
import { BOARD_IDS, MONDAY_COLUMNS } from "../../constants/monday";

const COL = MONDAY_COLUMNS.MASTER_COSTS;

function buildColumnValues({ type, description, quantity, rate, date, workOrderId }) {
  const cv = {};

  // Status column — Monday requires { label: "..." }
  if (type) cv[COL.TYPE] = { label: type };

  // Number columns — plain number
  if (quantity != null) cv[COL.QUANTITY] = Number(quantity);
  if (rate != null) cv[COL.RATE] = Number(rate);

  const total = (Number(quantity || 0) * Number(rate || 0));
  if (total >= 0) cv[COL.TOTAL_COST] = total;

  // Text column — plain string
  if (description) cv[COL.DESCRIPTION] = description;

  // Date column — Monday requires { date: "YYYY-MM-DD" }
  if (date) cv[COL.DATE] = { date };

  // Board relation — Monday requires { item_ids: [number] }
  if (workOrderId) cv[COL.WORK_ORDERS_REL] = { item_ids: [Number(workOrderId)] };

  return JSON.stringify(cv);
}

export async function createMasterCostItem({ type, description, quantity, rate, date, workOrderId }) {
  const cv = buildColumnValues({ type, description, quantity, rate, date, workOrderId });

  const data = await executeMutation(
    CREATE_ITEM,
    {
      boardId: BOARD_IDS.MASTER_COSTS,
      groupId: "topics",
      name: description || type || "Cost Item",
      cv,
    },
    "createMasterCostItem"
  );

  return data.create_item;
}

export async function updateMasterCostItem(mondayItemId, { type, description, quantity, rate, date, workOrderId }) {
  const cv = buildColumnValues({ type, description, quantity, rate, date, workOrderId });

  const data = await executeMutation(
    UPDATE_ITEM_COLUMNS,
    {
      boardId: BOARD_IDS.MASTER_COSTS,
      itemId: String(mondayItemId),
      cv,
    },
    "updateMasterCostItem"
  );

  return data.change_multiple_column_values;
}
