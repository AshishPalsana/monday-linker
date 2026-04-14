import { mondayClient } from "./client";
import { FETCH_TIME_ENTRIES } from "./queries";
import { BOARD_IDS, MONDAY_COLUMNS } from "../../constants/monday";

const COL = MONDAY_COLUMNS.TIME_ENTRIES;

export async function fetchTimeEntries() {
  const { data, errors } = await mondayClient.query({
    query: FETCH_TIME_ENTRIES,
    variables: {
      boardId: BOARD_IDS.TIME_ENTRIES,
      colIds: [
        COL.TOTAL_HOURS,
        COL.CLOCK_IN,
        COL.CLOCK_OUT,
        COL.TASK_TYPE,
        COL.TECHNICIANS,
        COL.WORK_ORDERS_REL,
        COL.EXPENSES_ADDED,
      ],
    },
  });

  if (errors?.length) throw new Error(errors[0].message);
  return data.boards[0]?.items_page?.items ?? [];
}
