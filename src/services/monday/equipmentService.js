import { CREATE_ITEM, UPDATE_ITEM_COLUMNS, UPDATE_ITEM_NAME } from "./mutations";
import { executeMutation, setRelationColumn } from "./baseService";
import { BOARD_IDS, GROUP_IDS, MONDAY_COLUMNS } from "../../constants/monday";
import { isValidMondayId } from "../../utils/mondayUtils";

const COL = MONDAY_COLUMNS.EQUIPMENT;

/**
 * Creates a new equipment item.
 * @param {Object} form Equipment data
 */
export async function createEquipment(form) {
  const cv = {};
  if (form.manufacturer) cv[COL.MANUFACTURER] = form.manufacturer;
  if (form.modelNumber) cv[COL.MODEL_NUMBER] = form.modelNumber;
  if (form.serialNumber) cv[COL.SERIAL_NUMBER] = form.serialNumber;
  if (form.installDate) cv[COL.INSTALL_DATE] = { date: form.installDate };
  if (form.status) cv[COL.STATUS] = { label: form.status };
  if (form.notes) cv[COL.NOTES] = { text: form.notes };

  const data = await executeMutation(
    CREATE_ITEM,
    {
      boardId: BOARD_IDS.EQUIPMENT,
      groupId: GROUP_IDS.EQUIPMENT_ACTIVE,
      name: form.name,
      cv: JSON.stringify(cv),
    },
    "createEquipment"
  );

  const created = data.create_item;

  if (form.locationId && isValidMondayId(created.id)) {
    await setEquipmentLocation(created.id, form.locationId);
  }

  return created;
}

/**
 * Updates an existing equipment item.
 */
export async function updateEquipment(itemId, form) {
  if (!isValidMondayId(itemId)) {
    throw new Error(`Invalid equipment ID: ${itemId}`);
  }

  const cv = {};
  if (form.manufacturer !== undefined) cv[COL.MANUFACTURER] = form.manufacturer;
  if (form.modelNumber !== undefined) cv[COL.MODEL_NUMBER] = form.modelNumber;
  if (form.serialNumber !== undefined) cv[COL.SERIAL_NUMBER] = form.serialNumber;
  if (form.installDate !== undefined) {
    cv[COL.INSTALL_DATE] = form.installDate ? { date: form.installDate } : { date: null };
  }
  if (form.status !== undefined) cv[COL.STATUS] = { label: form.status || "" };
  if (form.notes !== undefined) cv[COL.NOTES] = { text: form.notes };

  if (Object.keys(cv).length > 0) {
    await executeMutation(
      UPDATE_ITEM_COLUMNS,
      {
        boardId: BOARD_IDS.EQUIPMENT,
        itemId: String(itemId),
        cv: JSON.stringify(cv),
      },
      "updateEquipmentColumns"
    );
  }

  if (form.locationId !== undefined) {
    await setEquipmentLocation(itemId, form.locationId || null);
  }

  if (form.name) {
    await executeMutation(
      UPDATE_ITEM_NAME,
      {
        boardId: BOARD_IDS.EQUIPMENT,
        itemId: String(itemId),
        name: form.name,
      },
      "updateEquipmentName"
    );
  }
}

/**
 * Links equipment to a location.
 */
export async function setEquipmentLocation(equipmentId, locationId) {
  await setRelationColumn(
    BOARD_IDS.EQUIPMENT,
    equipmentId,
    COL.LOCATION,
    locationId
  );
}
