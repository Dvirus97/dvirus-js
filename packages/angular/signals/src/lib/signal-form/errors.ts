import {
  SignalFormContext,
  SignalFormValidationError,
  SignalFormValidatorFn,
} from './types';

/**
 * Normalizes a validation error object by filtering out empty/null values.
 * 
 * Converts a raw validation result into a clean error map containing only
 * non-empty string messages. Filters out undefined, null, and empty strings.
 * 
 * @param error - Raw validation error object or null
 * @returns Clean error map with only valid error messages
 * 
 * @example
 * ```typescript
 * normalizeValidationError({ required: 'Error', empty: '', invalid: null });
 * // Returns: { required: 'Error' }
 * ```
 */
export function normalizeValidationError(
  error: SignalFormValidationError,
): Record<string, string> {
  if (!error) return {};
  return Object.entries(error).reduce<Record<string, string>>(
    (acc, [key, val]) => {
      if (typeof val === 'string' && val.length > 0) {
        acc[key] = val;
      }
      return acc;
    },
    {},
  );
}

/**
 * Executes an array of validators and collects all error messages.
 * 
 * Runs each validator function with the provided context and merges all
 * error messages into a single error map. Empty/null results are filtered out.
 * 
 * @template TControls - Object type defining available sibling controls
 * @template TValue - The type of value being validated
 * 
 * @param validators - Array of validator functions to execute
 * @param ctx - Validation context with current value and control accessor
 * @returns Combined error map from all validators
 * 
 * @example
 * ```typescript
 * const errors = collectValidationErrors(
 *   [signalFormValidators.required, signalFormValidators.minLength(3)],
 *   { item: { value: '' }, getControl: () => {} }
 * );
 * // Returns: { required: 'This field is required' }
 * ```
 */
export function collectValidationErrors<TControls extends object, TValue>(
  validators: SignalFormValidatorFn<TControls, TValue>[] | undefined,
  ctx: SignalFormContext<TControls, TValue>,
): Record<string, string> {
  if (!validators?.length) return {};
  return validators.reduce<Record<string, string>>((acc, validator) => {
    const normalized = normalizeValidationError(validator(ctx));
    Object.entries(normalized).forEach(([key, val]) => {
      acc[key] = val;
    });
    return acc;
  }, {});
}

/**
 * Checks if an error map contains any errors.
 * 
 * Simple utility to determine if a control has validation errors by
 * checking if the error map object has any keys.
 * 
 * @param errorMap - Error map to check
 * @returns True if there are any errors, false if empty
 * 
 * @example
 * ```typescript
 * hasErrors({ required: 'Error' }); // true
 * hasErrors({}); // false
 * ```
 */
export function hasErrors(errorMap: Record<string, string>): boolean {
  return Object.keys(errorMap).length > 0;
}

/**
 * Recursively checks if an error tree structure is completely empty.
 * 
 * Traverses nested error structures (objects and arrays) to determine if
 * there are any actual error messages anywhere in the tree. Returns true
 * only when the entire structure contains no errors.
 * 
 * @param value - Error tree to check (can be nested objects/arrays)
 * @returns True if no errors exist anywhere in the tree
 * 
 * @example
 * ```typescript
 * isEmptyErrorTree({ name: undefined, address: { street: undefined } }); // true
 * isEmptyErrorTree({ name: { required: 'Error' } }); // false
 * isEmptyErrorTree([undefined, undefined]); // true
 * ```
 */
export function isEmptyErrorTree(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) {
    return value.every(isEmptyErrorTree);
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(
      isEmptyErrorTree,
    );
  }
  return false;
}
