import { CREATE_ITEM, UPDATE_ITEM_COLUMNS } from "./mutations";
import { executeMutation, updateItemName } from "./baseService";
import { BOARD_IDS, GROUP_IDS, MONDAY_COLUMNS } from "../../constants/monday";
import { isValidMondayId } from "../../utils/mondayUtils";

const COL = MONDAY_COLUMNS.LOCATIONS;

export async function createLocation(form) {
  const cv = {};
  if (form.streetAddress) cv[COL.STREET_ADDRESS] = form.streetAddress;
  if (form.city) cv[COL.CITY] = form.city;
  if (form.zip) cv[COL.ZIP] = form.zip;
  if (form.locationStatus) cv[COL.STATUS] = { label: form.locationStatus };
  if (form.notes) cv[COL.NOTES] = { text: form.notes };

  const data = await executeMutation(
    CREATE_ITEM,
    {
      boardId: BOARD_IDS.LOCATIONS,
      groupId: GROUP_IDS.LOCATIONS_ACTIVE,
      name: form.name,
      cv: JSON.stringify(cv),
    },
    "createLocation",
  );

  return data.create_item;
}

export async function updateLocation(itemId, form) {
  if (!isValidMondayId(itemId)) {
    throw new Error(`Cannot update location: invalid id "${itemId}".`);
  }

  const cv = {};
  if (form.streetAddress !== undefined) cv[COL.STREET_ADDRESS] = form.streetAddress;
  if (form.city !== undefined) cv[COL.CITY] = form.city;
  if (form.zip !== undefined) cv[COL.ZIP] = form.zip;
  if (form.notes !== undefined) cv[COL.NOTES] = { text: form.notes };
  if (form.state !== undefined) {
    cv[COL.STATE] = form.state ? { labels: [form.state] } : { ids: [] };
  }
  if (form.locationStatus !== undefined) {
    cv[COL.STATUS] = { label: form.locationStatus || "" };
  }

  if (Object.keys(cv).length > 0) {
    await executeMutation(
      UPDATE_ITEM_COLUMNS,
      {
        boardId: BOARD_IDS.LOCATIONS,
        itemId: String(itemId),
        cv: JSON.stringify(cv),
      },
      "updateLocation",
    );
  }

  if (form.name) {
    await updateItemName(BOARD_IDS.LOCATIONS, itemId, form.name);
  }
}
