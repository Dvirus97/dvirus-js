import { Brand, createBrand } from './brand-factory';

/**
 * A branded string type whose value can be safely converted to a finite number.
 *
 * At runtime this is just a plain `string` — no wrapper objects.
 * The brand prevents accidental assignment of arbitrary strings at compile time.
 *
 * Accepts: integers, decimals, negatives, leading zeros (e.g. `"007"`).
 * Rejects: empty strings, whitespace-only, `"Infinity"`, `"NaN"`, mixed strings like `"3px"`.
 *
 * @example
 * ```ts
 * const n: NumericString = NumericString('3.14');  // ok
 * const n: NumericString = NumericString(-7);      // ok
 * const n: NumericString = NumericString('abc');   // throws
 * const n: NumericString = '3.14';                 // compile error
 * ```
 */
export type NumericString = Brand<string, 'NumericString'>;
export const NumericString = createBrand<NumericString, number | string>(
  'NumericString',
  (x): x is NumericString =>
    // checks that a given value is:
    // - a number, and the number is neither positive Infinity, negative Infinity, nor NaN.
    typeof x === 'string' && x.trim() !== '' && Number.isFinite(Number(x)),
  (x) => String(x),
);
