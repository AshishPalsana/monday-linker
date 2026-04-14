import { CREATE_ITEM, UPDATE_ITEM_COLUMNS } from "./mutations";
import { executeMutation, updateItemName } from "./baseService";
import { BOARD_IDS, GROUP_IDS, MONDAY_COLUMNS } from "../../constants/monday";
import { isValidMondayId } from "../../utils/mondayUtils";

const COL = MONDAY_COLUMNS.CUSTOMERS;

export async function createCustomer(form) {
  const cv = {};
  if (form.email) cv[COL.EMAIL] = { text: form.email, email: form.email };
  if (form.phone) cv[COL.PHONE] = { phone: form.phone, countryShortName: "US" };
  if (form.accountNumber) cv[COL.ACCOUNT_NUMBER] = form.accountNumber;
  if (form.billingAddress) cv[COL.BILLING_ADDRESS] = { text: form.billingAddress };
  if (form.status) cv[COL.STATUS] = { label: form.status };
  if (form.notes) cv[COL.NOTES] = { text: form.notes };

  const data = await executeMutation(
    CREATE_ITEM,
    {
      boardId: BOARD_IDS.CUSTOMERS,
      groupId: GROUP_IDS.CUSTOMERS_ACTIVE,
      name: form.name,
      cv: JSON.stringify(cv),
    },
    "createCustomer",
  );

  return data.create_item;
}

export async function updateCustomer(itemId, form) {
  if (!isValidMondayId(itemId)) {
    throw new Error(`Cannot update customer: invalid id "${itemId}".`);
  }

  const cv = {};
  if (form.email !== undefined) cv[COL.EMAIL] = { text: form.email, email: form.email };
  if (form.phone !== undefined) cv[COL.PHONE] = { phone: form.phone, countryShortName: "US" };
  if (form.accountNumber !== undefined) cv[COL.ACCOUNT_NUMBER] = form.accountNumber;
  if (form.billingAddress !== undefined) cv[COL.BILLING_ADDRESS] = { text: form.billingAddress };
  if (form.billingTerms !== undefined) {
    cv[COL.BILLING_TERMS] = form.billingTerms ? { labels: [form.billingTerms] } : { ids: [] };
  }
  if (form.xeroContactId !== undefined) cv[COL.XERO_CONTACT_ID] = form.xeroContactId;
  if (form.xeroSyncStatus !== undefined) cv[COL.XERO_SYNC_STATUS] = { label: form.xeroSyncStatus || "" };
  if (form.status !== undefined) cv[COL.STATUS] = { label: form.status || "" };
  if (form.notes !== undefined) cv[COL.NOTES] = { text: form.notes };

  if (Object.keys(cv).length > 0) {
    await executeMutation(
      UPDATE_ITEM_COLUMNS,
      {
        boardId: BOARD_IDS.CUSTOMERS,
        itemId: String(itemId),
        cv: JSON.stringify(cv),
      },
      "updateCustomer",
    );
  }

  if (form.name) {
    await updateItemName(BOARD_IDS.CUSTOMERS, itemId, form.name);
  }
}
