import { mondayClient } from "./client";
import { SET_RELATION_COLUMN, UPDATE_ITEM_NAME } from "./mutations";
import { isValidMondayId } from "../../utils/mondayUtils";

/**
 * Executes a mutation and handles standard Monday errors.
 * @param {Object} mutation GraphQL mutation
 * @param {Object} variables Mutation variables
 * @param {string} errorPrefix Context for error messages
 */
export async function executeMutation(mutation, variables, errorPrefix) {
  const { data, errors } = await mondayClient.mutate({
    mutation,
    variables,
  });

  if (errors?.length) {
    console.error(`${errorPrefix} failed:`, { variables, errors });
    throw new Error(errors[0].message);
  }

  return data;
}

/**
 * Standard utility to set a relation column.
 */
export async function setRelationColumn(
  boardId,
  itemId,
  columnId,
  linkedItemId,
) {
  const numericId = linkedItemId ? Number(linkedItemId) : null;
  const value = JSON.stringify({
    item_ids: numericId ? [numericId] : [],
  });

  await executeMutation(
    SET_RELATION_COLUMN,
    {
      boardId: String(boardId),
      itemId: String(itemId),
      columnId,
      value,
    },
    "setRelationColumn",
  );
}

/**
 * Standard utility to update an item name.
 */
export async function updateItemName(boardId, itemId, name) {
  if (!isValidMondayId(itemId)) return;

  await executeMutation(
    UPDATE_ITEM_NAME,
    {
      boardId: String(boardId),
      itemId: String(itemId),
      name,
    },
    "updateItemName",
  );
}
