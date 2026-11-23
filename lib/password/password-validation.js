/**
 * Public interfaces supporting R12.1.
 * @module lib/password/password-validation
 */
/**
 * Return individual password-strength checks for the account creation form.
 * @function validatePassword
 * @memberof module:lib/password/password-validation
 * @static
 * @param {string} password - Password to check.
 * @returns {Object} Boolean checks named length, uppercase, lowercase, number and special.
 */
export function validatePassword(password) {
    const allowedSymbols = "!@#$%^&*()_+-=[]{};:'\"|<>?,./`~";
  
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: [...allowedSymbols].some((symbol) =>
        password.includes(symbol)
      ),
    };
  }
  
  export const requirementLabels = [
    ["length", "At least 8 characters"],
    ["uppercase", "At least one uppercase letter"],
    ["lowercase", "At least one lowercase letter"],
    ["number", "At least one number"],
    ["special", "At least one special character"],
  ];
