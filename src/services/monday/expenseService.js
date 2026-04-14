import { mondayClient } from "./client";
import { FETCH_EXPENSES } from "./queries";
import { BOARD_IDS, MONDAY_COLUMNS } from "../../constants/monday";

const COL = MONDAY_COLUMNS.EXPENSES;

export async function fetchExpenses(status) {
  const groupId =
    status === "Approved"
      ? "group_mm215rfc"
      : status === "Rejected"
        ? "group_mm217p3s"
        : "topics";

  const { data, errors } = await mondayClient.query({
    query: FETCH_EXPENSES,
    variables: {
      boardId: BOARD_IDS.EXPENSES,
      groupId,
      colIds: [
        COL.TECHNICIAN,
        COL.DESCRIPTION,
        COL.EXPENSE_TYPE,
        COL.WORK_ORDER,
        COL.AMOUNT,
      ],
    },
  });

  if (errors?.length) throw new Error(errors[0].message);
  return data.boards[0]?.groups[0]?.items_page?.items ?? [];
}
