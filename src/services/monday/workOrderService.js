import { CREATE_ITEM, UPDATE_ITEM_COLUMNS } from "./mutations";
import { executeMutation, updateItemName, setRelationColumn } from "./baseService";
import { BOARD_IDS, MONDAY_COLUMNS } from "../../constants/monday";
import { isValidMondayId } from "../../utils/mondayUtils";

const COL = MONDAY_COLUMNS.WORK_ORDERS;

export async function createWorkOrder(form) {
  const cv = {};
  if (form.description) cv[COL.DESCRIPTION] = { text: form.description };
  if (form.status) cv[COL.STATUS] = { label: form.status };

  const data = await executeMutation(
    CREATE_ITEM,
    {
      boardId: BOARD_IDS.WORK_ORDERS,
      groupId: form.groupId || "topics",
      name: form.name,
      cv: JSON.stringify(cv),
    },
    "createWorkOrder",
  );

  const created = data.create_item;

  // Handle Relations
  const relationCalls = [];
  if (form.customerId && isValidMondayId(form.customerId)) {
    relationCalls.push(setRelationColumn(BOARD_IDS.WORK_ORDERS, created.id, COL.CUSTOMER, form.customerId));
  }
  if (form.locationId && isValidMondayId(form.locationId)) {
    relationCalls.push(setRelationColumn(BOARD_IDS.WORK_ORDERS, created.id, COL.LOCATION, form.locationId));
  }

  if (relationCalls.length > 0) {
    await Promise.allSettled(relationCalls);
  }

  return created;
}

export async function updateWorkOrder(itemId, form) {
  if (!isValidMondayId(itemId)) {
    throw new Error(`Cannot update work order: invalid id "${itemId}".`);
  }

  const cv = {};
  if (form.description !== undefined) cv[COL.DESCRIPTION] = { text: form.description };
  if (form.status !== undefined) cv[COL.STATUS] = { label: form.status || "" };
  if (form.scheduledDate !== undefined) {
    cv[COL.SCHEDULED_DATE] = form.scheduledDate ? { date: form.scheduledDate } : { date: null };
  }
  if (form.multiDay !== undefined) {
    cv[COL.MULTI_DAY] = { checked: form.multiDay ? "true" : "false" };
  }
  if (form.serviceHistory !== undefined) cv[COL.SERVICE_HISTORY] = { text: form.serviceHistory };
  if (form.workPerformed !== undefined) cv[COL.WORK_PERFORMED] = { text: form.workPerformed };
  if (form.executionStatus !== undefined) cv[COL.EXECUTION_STATUS] = { label: form.executionStatus || "" };
  if (form.partsOrdered !== undefined) cv[COL.PARTS_ORDERED] = { label: form.partsOrdered || "" };

  if (Object.keys(cv).length > 0) {
    await executeMutation(
      UPDATE_ITEM_COLUMNS,
      {
        boardId: BOARD_IDS.WORK_ORDERS,
        itemId: String(itemId),
        cv: JSON.stringify(cv),
      },
      "updateWorkOrder",
    );
  }

  // Handle Relations
  const relationCalls = [];
  if (form.customerId !== undefined) {
    relationCalls.push(setRelationColumn(BOARD_IDS.WORK_ORDERS, itemId, COL.CUSTOMER, form.customerId || null));
  }
  if (form.locationId !== undefined) {
    relationCalls.push(setRelationColumn(BOARD_IDS.WORK_ORDERS, itemId, COL.LOCATION, form.locationId || null));
  }
  if (relationCalls.length > 0) {
    await Promise.allSettled(relationCalls);
  }

  if (form.name !== undefined && form.name.trim()) {
    await updateItemName(BOARD_IDS.WORK_ORDERS, itemId, form.name);
  }
}

export async function setWorkOrderRelation(workOrderId, itemId, columnId) {
  await setRelationColumn(BOARD_IDS.WORK_ORDERS, workOrderId, columnId, itemId);
}
