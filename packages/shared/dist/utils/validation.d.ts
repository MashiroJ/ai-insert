/**
 * Validation utilities
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * Create a successful validation result
 */
export declare function validResult(): ValidationResult;
/**
 * Create a failed validation result
 */
export declare function invalidResult(errors: string[], warnings?: string[]): ValidationResult;
/**
 * Validate that a value is not null or undefined
 */
export declare function validateRequired<T>(value: T | null | undefined, fieldName: string): ValidationResult;
/**
 * Validate a string is not empty
 */
export declare function validateNonEmpty(value: string, fieldName: string): ValidationResult;
/**
 * Validate a URL string
 */
export declare function validateUrl(value: string, fieldName: string): ValidationResult;
/**
 * Validate a CSS selector
 */
export declare function validateSelector(value: string, fieldName: string): ValidationResult;
/**
 * Validate an object has required properties
 */
export declare function validateShape<T extends Record<string, unknown>>(obj: T | null | undefined, required: (keyof T)[], objName?: string): ValidationResult;
/**
 * Combine multiple validation results
 */
export declare function combineValidationResults(...results: ValidationResult[]): ValidationResult;
/**
 * Validate a file path (basic check)
 */
export declare function validateFilePath(value: string, fieldName: string): ValidationResult;
/**
 * Validate a number is within a range
 */
export declare function validateRange(value: number, fieldName: string, min?: number, max?: number): ValidationResult;
/**
 * Validate an array has a minimum length
 */
export declare function validateMinLength<T>(value: T[], fieldName: string, minLength: number): ValidationResult;
//# sourceMappingURL=validation.d.ts.map