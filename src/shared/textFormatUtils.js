/**
 * Utility functions for text formatting
 * Used across DMS and FURNI modules for consistent data formatting
 */

/**
 * Converts a string to Title Case (First Letter of Each Word Capitalized)
 * Handles multiple spaces, special characters, and edge cases
 * 
 * @param {string} str - The string to convert
 * @returns {string} - The title-cased string
 * 
 * Examples:
 * - "john doe" => "John Doe"
 * - "JOHN DOE" => "John Doe"
 * - "john  doe" => "John  Doe" (preserves spaces)
 * - "123 main street" => "123 Main Street"
 * - "ram's house" => "Ram's House"
 */
export const toTitleCase = (str) => {
  if (!str || typeof str !== 'string') return '';
  
  // Process each character
  let result = '';
  let capitalizeNext = true; // Start with capital
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    
    // If it's a space or special character, keep it and capitalize next letter
    if (char === ' ' || char === '-' || char === "'") {
      result += char;
      capitalizeNext = true;
    } else {
      // If we should capitalize, make it uppercase, otherwise lowercase
      result += capitalizeNext ? char.toUpperCase() : char.toLowerCase();
      capitalizeNext = false;
    }
  }
  
  return result;
};

/**
 * Formats text fields for form submission
 * Applies title case to specified fields
 * 
 * @param {Object} data - The form data object
 * @param {Array<string>} fieldsToFormat - Array of field names to apply title case
 * @returns {Object} - The formatted data object
 */
export const formatFormData = (data, fieldsToFormat = []) => {
  const formattedData = { ...data };
  
  fieldsToFormat.forEach(field => {
    if (formattedData[field] && typeof formattedData[field] === 'string') {
      formattedData[field] = toTitleCase(formattedData[field]);
    }
  });
  
  return formattedData;
};
