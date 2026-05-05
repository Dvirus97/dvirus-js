import { Brand, createBrand } from "./brand-factory";

const NUMERIC = /^\d+$/;

/**
 * A branded string type that only contains digit characters (`0-9`).
 *
 * At runtime this is just a plain `string` — no wrapper objects.
 * The brand prevents accidental assignment of arbitrary strings at compile time.
 *
 * @example
 * ```ts
 * const id: NumericString = NumericString('123'); // ok
 * const id: NumericString = '123';                // compile error
 * ```
 */
export type NumericString = Brand<string, 'NumericString'>;
export const NumericString = createBrand<NumericString, number | string>(
  'NumericString',
  (x): x is NumericString => NUMERIC.test(String(x)),
  (x) => String(x),
);



// const NUMERIC = /^\d+$/;
//
// /**
//  * A branded string type that only contains digit characters (`0-9`).
//  *
//  * At runtime this is just a plain `string` — no wrapper objects.
//  * The brand prevents accidental assignment of arbitrary strings at compile time.
//  *
//  * @example
//  * ```ts
//  * const id: NumericString = NumericString('123'); // ok
//  * const id: NumericString = '123';                // compile error
//  * ```
//  */
// export type NumericString = string & { readonly __brand: 'NumericString' };

// function testNumericString(value: number | string): boolean {
//   return NUMERIC.test(String(value));
// }

// /**
//  * Creates a `NumericString` from a number or string.
//  * Throws if the value contains non-digit characters.
//  *
//  * @param value - A number or string to convert
//  * @returns A branded `NumericString`
//  * @throws Error if the value is not purely numeric
//  *
//  * @example
//  * ```ts
//  * NumericString(42);    // '42' as NumericString
//  * NumericString('123'); // '123' as NumericString
//  * NumericString('abc'); // throws Error
//  * ```
//  */
// export function NumericString(value: number | string): NumericString {
//   const str = String(value);
//   if (!testNumericString(str)) throw new Error(`"${str}" is not a numeric string`);
//   return str as NumericString;
// }

// /**
//  * Attempts to create a `NumericString` without throwing.
//  * Returns `undefined` if the value is not purely numeric.
//  *
//  * @param value - A number or string to convert
//  * @returns A `NumericString` or `undefined`
//  *
//  * @example
//  * ```ts
//  * NumericString.from('123'); // '123' as NumericString
//  * NumericString.from('abc'); // undefined
//  * ```
//  */
// NumericString.from = (value: number | string): NumericString | undefined => {
//   const str = String(value);
//   return testNumericString(str) ? (str as NumericString) : undefined;
// };

// /**
//  * Type guard that checks if a value is a valid `NumericString`.
//  *
//  * @param value - Any value to check
//  * @returns `true` if the value is a string containing only digits
//  *
//  * @example
//  * ```ts
//  * if (NumericString.is(input)) {
//  *   input; // narrowed to NumericString
//  * }
//  * ```
//  */
// NumericString.is = (value: unknown): value is NumericString => {
//   return testNumericString(String(value ?? ''));
// };
