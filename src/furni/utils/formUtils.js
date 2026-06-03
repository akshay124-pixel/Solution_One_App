import isEqual from 'lodash/isEqual';
import isDate from 'lodash/isDate';

/**
 * Normalizes values to ensure consistent comparison.
 * Treats null, undefined, and empty strings as equivalent.
 */
const normalize = (val) => {
    if (val === null || val === undefined || val === "") return "";
    if (isDate(val)) return val.getTime();
    return val;
};

/**
 * Returns an object containing only the fields that differ between original and current.
 * Performs deep comparison for arrays and handles date normalization.
 */
export const getDirtyValues = (original, current) => {
    const dirty = {};

    Object.keys(current).forEach((key) => {
        const originalVal = original[key];
        const currentVal = current[key];

        // 1. Deep comparison for Arrays (Products, etc.)
        if (Array.isArray(currentVal)) {
            if (!Array.isArray(originalVal) || !isEqual(currentVal, originalVal)) {
                dirty[key] = currentVal;
            }
            return;
        }

        // 2. Normalization-based comparison for primitive types and Dates
        if (normalize(originalVal) !== normalize(currentVal)) {
            dirty[key] = currentVal;
        }
    });

    return dirty;
};
