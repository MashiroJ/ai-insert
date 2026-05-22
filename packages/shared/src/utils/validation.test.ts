import { describe, it, expect } from 'vitest';
import {
  validResult,
  invalidResult,
  validateRequired,
  validateNonEmpty,
  validateUrl,
  validateShape,
  validateRange,
  validateMinLength,
  combineValidationResults,
} from './validation.js';

describe('validResult', () => {
  it('returns a valid result', () => {
    const r = validResult();
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });
});

describe('invalidResult', () => {
  it('returns an invalid result with errors', () => {
    const r = invalidResult(['field is required']);
    expect(r.valid).toBe(false);
    expect(r.errors).toEqual(['field is required']);
  });

  it('includes warnings', () => {
    const r = invalidResult(['error'], ['warning']);
    expect(r.warnings).toEqual(['warning']);
  });
});

describe('validateRequired', () => {
  it('passes for non-null values', () => {
    expect(validateRequired('hello', 'name').valid).toBe(true);
    expect(validateRequired(0, 'count').valid).toBe(true);
    expect(validateRequired(false, 'flag').valid).toBe(true);
  });

  it('fails for null', () => {
    expect(validateRequired(null, 'name').valid).toBe(false);
  });

  it('fails for undefined', () => {
    expect(validateRequired(undefined, 'name').valid).toBe(false);
  });
});

describe('validateNonEmpty', () => {
  it('passes for non-empty string', () => {
    expect(validateNonEmpty('hello', 'name').valid).toBe(true);
  });

  it('fails for empty string', () => {
    expect(validateNonEmpty('', 'name').valid).toBe(false);
  });

  it('fails for whitespace-only string', () => {
    expect(validateNonEmpty('   ', 'name').valid).toBe(false);
  });

  it('fails for null', () => {
    expect(validateNonEmpty(null as unknown as string, 'name').valid).toBe(false);
  });
});

describe('validateUrl', () => {
  it('passes for valid URL', () => {
    expect(validateUrl('http://localhost:3000', 'url').valid).toBe(true);
    expect(validateUrl('https://example.com/path?q=1', 'url').valid).toBe(true);
  });

  it('fails for invalid URL', () => {
    expect(validateUrl('not-a-url', 'url').valid).toBe(false);
  });

  it('fails for empty string', () => {
    expect(validateUrl('', 'url').valid).toBe(false);
  });
});

describe('validateShape', () => {
  it('passes when all required properties exist', () => {
    expect(validateShape({ a: 1, b: 2 }, ['a', 'b']).valid).toBe(true);
  });

  it('fails when a required property is missing', () => {
    const r = validateShape({ a: 1 }, ['a', 'b'] as 'a'[]);
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toContain('b');
  });

  it('fails for null', () => {
    expect(validateShape(null, ['a']).valid).toBe(false);
  });
});

describe('validateRange', () => {
  it('passes for value in range', () => {
    expect(validateRange(5, 'age', 0, 100).valid).toBe(true);
  });

  it('fails for value below min', () => {
    expect(validateRange(-1, 'age', 0).valid).toBe(false);
  });

  it('fails for value above max', () => {
    expect(validateRange(101, 'age', undefined, 100).valid).toBe(false);
  });

  it('passes when no bounds', () => {
    expect(validateRange(42, 'value').valid).toBe(true);
  });
});

describe('validateMinLength', () => {
  it('passes for array with enough items', () => {
    expect(validateMinLength([1, 2, 3], 'items', 3).valid).toBe(true);
  });

  it('fails for array too short', () => {
    expect(validateMinLength([1], 'items', 3).valid).toBe(false);
  });
});

describe('combineValidationResults', () => {
  it('combines multiple valid results', () => {
    const r = combineValidationResults(validResult(), validResult());
    expect(r.valid).toBe(true);
  });

  it('is invalid if any result has errors', () => {
    const r = combineValidationResults(validResult(), invalidResult(['fail']));
    expect(r.valid).toBe(false);
    expect(r.errors).toEqual(['fail']);
  });

  it('merges warnings', () => {
    const r = combineValidationResults(
      validResult(),
      invalidResult(['err'], ['warn1']),
    );
    expect(r.warnings).toEqual(['warn1']);
  });
});
