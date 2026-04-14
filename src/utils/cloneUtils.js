/**
 * Utility for deep cloning objects.
 * Standardizes the hacky JSON.parse(JSON.stringify()) pattern.
 */

/**
 * Deep clones an object using JSON serialization.
 * Suitable for simple data objects (like those from Monday API).
 * @param {Object} obj
 * @returns {Object}
 */
export function deepClone(obj) {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
}
