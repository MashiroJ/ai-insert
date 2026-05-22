/**
 * Validation utilities
 */
/**
 * Create a successful validation result
 */
export function validResult() {
    return {
        valid: true,
        errors: [],
        warnings: [],
    };
}
/**
 * Create a failed validation result
 */
export function invalidResult(errors, warnings = []) {
    return {
        valid: false,
        errors,
        warnings,
    };
}
/**
 * Validate that a value is not null or undefined
 */
export function validateRequired(value, fieldName) {
    if (value === null || value === undefined) {
        return invalidResult([`${fieldName} is required`]);
    }
    return validResult();
}
/**
 * Validate a string is not empty
 */
export function validateNonEmpty(value, fieldName) {
    const requiredResult = validateRequired(value, fieldName);
    if (!requiredResult.valid) {
        return requiredResult;
    }
    if (value.trim().length === 0) {
        return invalidResult([`${fieldName} cannot be empty`]);
    }
    return validResult();
}
/**
 * Validate a URL string
 */
export function validateUrl(value, fieldName) {
    const nonEmptyResult = validateNonEmpty(value, fieldName);
    if (!nonEmptyResult.valid) {
        return nonEmptyResult;
    }
    try {
        new URL(value);
        return validResult();
    }
    catch {
        return invalidResult([`${fieldName} must be a valid URL`]);
    }
}
/**
 * Validate a CSS selector
 */
export function validateSelector(value, fieldName) {
    const nonEmptyResult = validateNonEmpty(value, fieldName);
    if (!nonEmptyResult.valid) {
        return nonEmptyResult;
    }
    try {
        document.querySelector(value);
        return validResult();
    }
    catch (e) {
        return invalidResult([`${fieldName} must be a valid CSS selector: ${e}`]);
    }
}
/**
 * Validate an object has required properties
 */
export function validateShape(obj, required, objName = 'object') {
    const requiredResult = validateRequired(obj, objName);
    if (!requiredResult.valid) {
        return requiredResult;
    }
    const errors = [];
    for (const prop of required) {
        if (!(prop in obj)) {
            errors.push(`${objName} is missing required property: "${String(prop)}"`);
        }
    }
    if (errors.length > 0) {
        return invalidResult(errors);
    }
    return validResult();
}
/**
 * Combine multiple validation results
 */
export function combineValidationResults(...results) {
    const allErrors = results.flatMap((r) => r.errors);
    const allWarnings = results.flatMap((r) => r.warnings);
    return {
        valid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
    };
}
/**
 * Validate a file path (basic check)
 */
export function validateFilePath(value, fieldName) {
    const nonEmptyResult = validateNonEmpty(value, fieldName);
    if (!nonEmptyResult.valid) {
        return nonEmptyResult;
    }
    // Basic check for common file path patterns
    const validPatterns = [
        /^\.\.?\//, // Relative path
        /^\.?\//, // Relative path
        /^[A-Za-z]:\\/, // Windows absolute path
        /^\//, // Unix absolute path
    ];
    const isValid = validPatterns.some((pattern) => pattern.test(value));
    if (!isValid) {
        return invalidResult([
            `${fieldName} must be a valid file path (relative or absolute)`
        ]);
    }
    return validResult();
}
/**
 * Validate a number is within a range
 */
export function validateRange(value, fieldName, min, max) {
    if (min !== undefined && value < min) {
        return invalidResult([`${fieldName} must be at least ${min}`]);
    }
    if (max !== undefined && value > max) {
        return invalidResult([`${fieldName} must be at most ${max}`]);
    }
    return validResult();
}
/**
 * Validate an array has a minimum length
 */
export function validateMinLength(value, fieldName, minLength) {
    if (value.length < minLength) {
        return invalidResult([
            `${fieldName} must have at least ${minLength} item${minLength === 1 ? '' : 's'}`
        ]);
    }
    return validResult();
}
//# sourceMappingURL=validation.js.map