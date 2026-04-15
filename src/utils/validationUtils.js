/**
 * Form validation and cleaning utilities
 */

/**
 * Validates basic email format
 * @param {string} email 
 * @returns {boolean}
 */
export const validateEmail = (email) => {
  if (!email) return false;
  // Basic regex for user@domain.tld
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Removes all non-digit characters from a phone number string
 * @param {string} value 
 * @returns {string}
 */
export const cleanPhoneNumber = (value) => {
  if (!value) return "";
  return value.replace(/\D/g, "");
};
