import { FETCH_EXPENSES } from "./queries";
import { CREATE_ITEM } from "./mutations";
import { executeMutation } from "./baseService";
import { BOARD_IDS, MONDAY_COLUMNS, GROUP_IDS } from "../../constants/monday";
import { mondayClient } from "./client";

const COL = MONDAY_COLUMNS.EXPENSES;

export async function fetchExpenses(status) {
  const groupId = status === "Approved" ? "group_mm215rfc" : status === "Rejected" ? "group_mm217p3s" : "topics";

  const { data, errors } = await mondayClient.query({
    query: FETCH_EXPENSES,
    variables: {
      boardId: BOARD_IDS.EXPENSES,
      groupId,
      colIds: [COL.TECHNICIAN, COL.DESCRIPTION, COL.EXPENSE_TYPE, COL.WORK_ORDER_REL, COL.AMOUNT],
    },
  });

  if (errors?.length) throw new Error(errors[0].message);
  return data.boards[0]?.groups[0]?.items_page?.items ?? [];
}

export async function createExpense({ type, amount, description, timeEntryMondayId, workOrderId, technicianId }) {
  const cv = {};

  if (type) cv[COL.EXPENSE_TYPE] = { labels: [type] };
  if (amount != null) cv[COL.AMOUNT] = amount;
  if (description) cv[COL.DESCRIPTION] = description;
  if (timeEntryMondayId) cv[COL.TIME_ENTRY_REL] = { item_ids: [Number(timeEntryMondayId)] };
  if (workOrderId) cv[COL.WORK_ORDER_REL] = { item_ids: [Number(workOrderId)] };
  // if (technicianId) cv[COL.TECHNICIAN] = { personsAndTeams: [{ id: String(technicianId), kind: "person" }] };

  const data = await executeMutation(
    CREATE_ITEM,
    {
      boardId: BOARD_IDS.EXPENSES,
      groupId: GROUP_IDS.EXPENSES_PENDING,
      name: type ?? "Expense",
      cv: JSON.stringify(cv),
    },
    "createExpense"
  );

  return data.create_item;
}
