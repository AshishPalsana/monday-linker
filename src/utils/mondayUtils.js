/**
 * Utilities for interacting with and parsing Monday.com data structures.
 */

/**
 * Validates if a string or number is a valid Monday.com item ID (numeric string)
 * @param {string|number} id
 * @returns {boolean}
 */
export function isValidMondayId(id) {
  return id && /^\d+$/.test(String(id));
}

/**
 * Parses a relation column value and returns an array of linked item IDs.
 * @param {string} value JSON string from Monday API
 * @returns {Array<number>}
 */
export function parseRelationIds(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    const ids =
      parsed?.item_ids ||
      parsed?.linkedPulseIds ||
      parsed?.linked_item_ids ||
      [];
    return Array.isArray(ids)
      ? ids
          .map((p) => (typeof p === "object" ? p.linkedPulseId || p.id : p))
          .filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

/**
 * Standard utility to get a display string from a Monday column value.
 * Handles Status, Relation, Text, etc.
 * @param {Object} item Monday item object
 * @param {string} colId Column ID to fetch
 * @param {Object} [options] Configuration
 * @param {Object} [options.idMap] Map of ID -> Name for relation lookup
 * @returns {string}
 */
export function getColumnDisplayValue(item, colId, { idMap } = {}) {
  if (!item) return "";
  const col = item.column_values?.find((cv) => cv.id === colId);
  if (!col) return "";

  // Handle Relation Columns
  if (col.id.startsWith("board_relation")) {
    if (col.display_value && col.display_value.trim()) return col.display_value;
    if (col.text && col.text.trim()) return col.text;

    if (idMap && col.value) {
      const ids = parseRelationIds(col.value);
      const names = ids.map((id) => idMap[id]).filter(Boolean);
      if (names.length > 0) return names.join(", ");
    }
  }

  // Handle Box/Checkbox
  if (col.id.startsWith("boolean")) {
    try {
      const parsed = JSON.parse(col.value);
      return parsed?.checked === "true" ? "Yes" : "No";
    } catch {
      return col.text || "";
    }
  }

  return col.label || col.text || "";
}

/**
 * Extracts a snapshot of a column's raw values for optimistic updates/reverts.
 * @param {Object} item
 * @param {string} colId
 * @returns {Object}
 */
export function getColumnSnapshot(item, colId) {
  if (!item) return { value: null, text: null, display_value: null };
  const col = item.column_values?.find((cv) => cv.id === colId);
  if (!col) return { value: null, text: null, display_value: null };
  return {
    value: col.value,
    text: col.text,
    display_value: col.display_value || null,
  };
}
