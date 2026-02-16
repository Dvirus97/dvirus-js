import { SignalFormValidatorFn } from './types';

export type {
  FirstError,
  SignalFormValidationError,
  SignalFormValidatorFn,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValidatorFn = SignalFormValidatorFn<any, any>;

/**
 * Regular expression for email validation.
 * 
 * Aligned with Angular's built-in email validator. Validates standard email formats
 * with proper domain and local parts.
 * 
 * Pattern requirements:
 * - Total length: 1-254 characters
 * - Local part (before @): 1-64 characters
 * - Allows alphanumeric and special characters: !#$%&'*+/=?^_`{|}~-
 * - Domain must have valid format with optional subdomains
 */
const EMAIL_REGEXP =
  /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Determines if a value is considered empty for validation purposes.
 * 
 * Checks various types:
 * - null/undefined: always empty
 * - Numbers: empty when equals 0
 * - Strings/Arrays: empty when length is 0
 * - Sets: empty when size is 0
 * 
 * @param value - Value to check for emptiness
 * @returns True if the value is considered empty
 * 
 * @example
 * ```typescript
 * isEmptyInputValue(null); // true
 * isEmptyInputValue(''); // true
 * isEmptyInputValue(0); // true
 * isEmptyInputValue('hello'); // false
 * ```
 */
function isEmptyInputValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  // TODO 1: check if number==0 is empty or number.length==0 is empty
  if (typeof value === 'number' /* or - isNumber(value) */) {
    return value == 0;
  }
  if (Array.isArray(value) || typeof value === 'string') {
    return value.length === 0;
  }
  if (value instanceof Set) {
    return value.size === 0;
  }
  return false;
}

/**
 * Type guard that checks if a value can be coerced to a valid number.
 * 
 * Uses JavaScript's Number coercion and checks for NaN to determine
 * if a value represents a valid numeric value.
 * 
 * @param value - Value to check
 * @returns True if value is or can be coerced to a number
 * 
 * @example
 * ```typescript
 * isNumber(42); // true
 * isNumber('42'); // true
 * isNumber('hello'); // false
 * ```
 */
function isNumber(value: unknown): value is number {
  return !Number.isNaN(Number(value));
}

/**
 * Validator that requires a non-empty value.
 * 
 * Fails when the value is null, undefined, empty string, empty array,
 * zero (for numbers), or empty Set.
 * 
 * @param ctx - Validation context with the value to check
 * @returns Error object with 'required' key if validation fails, null otherwise
 * 
 * @example
 * ```typescript
 * const control = signalForm({ name: { value: '', validators: [signalFormValidators.required] } });
 * // control.controls.name.errors() => { required: 'This field is required' }
 * ```
 */
const required: ValidatorFn = ({ item: { value } }) =>
  isEmptyInputValue(value) ? { required: 'This field is required' } : null;

/**
 * Validator that enforces a maximum string or number length.
 * 
 * Converts the value to string and checks if its length exceeds the specified maximum.
 * Works with both string and number types.
 * 
 * @param num - Maximum allowed length (inclusive)
 * @returns Validator function
 * 
 * @example
 * ```typescript
 * const control = signalForm({
 *   username: { value: 'verylongusername', validators: [signalFormValidators.maxLength(10)] }
 * });
 * // control.controls.username.errors() => { maxLength: 'To long' }
 * ```
 */
function maxLength(num: number): ValidatorFn {
  return ({ item: { value } }) =>
    (typeof value == 'string' || typeof value == 'number') &&
    value.toString().length > num
      ? { maxLength: 'To long' }
      : null;
}

/**
 * Validator that enforces a minimum string or number length.
 * 
 * Converts the value to string and checks if its length is less than or equal to the specified minimum.
 * Works with both string and number types.
 * 
 * @param num - Minimum required length (inclusive)
 * @returns Validator function
 * 
 * @example
 * ```typescript
 * const control = signalForm({
 *   code: { value: 'ab', validators: [signalFormValidators.minLength(3)] }
 * });
 * // control.controls.code.errors() => { minLength: 'To short' }
 * ```
 */
function minLength(num: number): ValidatorFn {
  return ({ item: { value } }) =>
    (typeof value == 'string' || typeof value == 'number') &&
    value.toString().length <= num
      ? { minLength: 'To short' }
      : null;
}

/**
 * Validator that enforces a minimum numeric value.
 * 
 * Checks if a numeric value is less than or equal to the specified minimum.
 * Value is coerced to a number for comparison.
 * 
 * @param num - Minimum allowed value (exclusive - value must be greater than this)
 * @returns Validator function
 * 
 * @example
 * ```typescript
 * const control = signalForm({
 *   age: { value: -5, validators: [signalFormValidators.min(0)] }
 * });
 * // control.controls.age.errors() => { minLength: 'To small' }
 * ```
 */
function min(num: number): ValidatorFn {
  return ({ item: { value } }) =>
    isNumber(value) && value <= num ? { minLength: 'To small' } : null;
}

/**
 * Validator that enforces a maximum numeric value.
 * 
 * Checks if a numeric value exceeds the specified maximum.
 * Value is coerced to a number for comparison.
 * 
 * @param num - Maximum allowed value (inclusive)
 * @returns Validator function
 * 
 * @example
 * ```typescript
 * const control = signalForm({
 *   age: { value: 150, validators: [signalFormValidators.max(120)] }
 * });
 * // control.controls.age.errors() => { minLength: 'To big' }
 * ```
 */
function max(num: number): ValidatorFn {
  return ({ item: { value } }) =>
    isNumber(value) && value > num ? { minLength: 'To big' } : null;
}

/**
 * Validator that checks if a value is a valid email address.
 * 
 * Uses Angular-compatible email regex pattern to validate email format.
 * Skips validation for empty values (use with `required` if needed).
 * 
 * @param ctx - Validation context with the email value to check
 * @returns Error object with 'email' key if validation fails, null otherwise
 * 
 * @example
 * ```typescript
 * const control = signalForm({
 *   email: { value: 'invalid-email', validators: [signalFormValidators.email] }
 * });
 * // control.controls.email.errors() => { email: 'Invalid email' }
 * ```
 */
const email: ValidatorFn = ({ item: { value } }) => {
  if (isEmptyInputValue(value)) return null;
  return EMAIL_REGEXP.test(String(value)) ? null : { email: 'Invalid email' };
};

/**
 * Validator that checks if a value matches a specified regular expression pattern.
 * 
 * Accepts either a RegExp object or a string pattern. String patterns are automatically
 * wrapped with ^ and $ anchors to match the entire value.
 * 
 * Skips validation for empty values (use with `required` if needed).
 * 
 * @param valuePattern - Regular expression or pattern string to match against
 * @returns Validator function
 * 
 * @example
 * ```typescript
 * // Using regex
 * const control1 = signalForm({
 *   code: { value: 'abc', validators: [signalFormValidators.pattern(/^[0-9]+$/)] }
 * });
 * // control1.controls.code.errors() => { pattern: 'RequiredPattern: ^[0-9]+$, ActualValue: abc' }
 * 
 * // Using string pattern
 * const control2 = signalForm({
 *   zipCode: { value: 'ABC', validators: [signalFormValidators.pattern('[0-9]{5}')] }
 * });
 * ```
 */
function pattern(valuePattern: string | RegExp): ValidatorFn {
  if (!valuePattern) return () => null;
  let regex: RegExp;
  let regexStr: string;
  if (typeof valuePattern === 'string') {
    regexStr = '';
    if (valuePattern.charAt(0) !== '^') regexStr += '^';
    regexStr += valuePattern;
    if (valuePattern.charAt(valuePattern.length - 1) !== '$') regexStr += '$';
    regex = new RegExp(regexStr);
  } else {
    regexStr = valuePattern.toString();
    regex = valuePattern;
  }

  return ({ item: { value } }) => {
    if (isEmptyInputValue(value)) return null;
    const valueStr = String(value);
    return regex.test(valueStr)
      ? null
      : {
          pattern: `RequiredPattern: ${regexStr}, ActualValue: ${valueStr}`,
        };
  };
}

/**
 * Collection of built-in validators for signal-form controls.
 * 
 * Provides common validation functions that can be used in the `validators` or `warnings`
 * arrays of form controls. All validators skip empty values except `required`.
 * 
 * @property required - Ensures the value is not empty (null, undefined, '', [], 0, empty Set)
 * @property maxLength - Ensures string/number length doesn't exceed maximum
 * @property minLength - Ensures string/number length meets minimum requirement
 * @property min - Ensures numeric value is greater than minimum (exclusive)
 * @property max - Ensures numeric value doesn't exceed maximum (inclusive)
 * @property email - Validates email address format using Angular-compatible regex
 * @property pattern - Validates value matches a regular expression pattern
 * 
 * @example
 * ```typescript
 * const form = signalForm({
 *   email: {
 *     value: '',
 *     validators: [signalFormValidators.required, signalFormValidators.email]
 *   },
 *   age: {
 *     value: 25,
 *     validators: [signalFormValidators.min(0), signalFormValidators.max(120)],
 *     warnings: [signalFormValidators.max(100)] // Warning but doesn't invalidate
 *   },
 *   username: {
 *     value: '',
 *     validators: [
 *       signalFormValidators.required,
 *       signalFormValidators.minLength(3),
 *       signalFormValidators.maxLength(20),
 *       signalFormValidators.pattern(/^[a-zA-Z0-9_]+$/)
 *     ]
 *   }
 * });
 * ```
 */
export const signalFormValidators = {
  required,
  maxLength,
  minLength,
  min,
  max,
  email,
  pattern,
};
