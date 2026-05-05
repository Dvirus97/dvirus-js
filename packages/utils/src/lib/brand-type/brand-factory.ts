import { tryCatch } from "../tryCatch";

/**
 * Creates a nominally typed value by intersecting a base type with a hidden marker.
 *
 * @typeParam T - The underlying runtime type.
 * @typeParam B - A unique compile-time brand marker.
 */
export type Brand<T, B> = T & { readonly __brand: B };

/**
 * Factory contract for creating and validating branded values.
 *
 * @typeParam BrandType - The branded output type.
 * @typeParam Param - The accepted input type.
 */
export interface BrandFactory<BrandType, Param> {
  /**
   * Creates a branded value or throws when the input is invalid.
   * @throws Error if the input does not satisfy the brand's validation predicate.
   */
  (value: Param): BrandType;

  /**
   * Creates a branded value when valid, otherwise returns `undefined`.
   */
  from(value: Param): BrandType | undefined;

  /**
   * Type guard that checks whether a value matches the branded type.
   */
  is(value: unknown): value is BrandType;
}

/**
 * Builds a branding factory from a runtime validation predicate.
 *
 * @param name - For Debugging: Human-readable brand name used in validation errors.
 * @param testFn - Predicate that validates whether a value matches the brand.
 * @param parseFn - Optional function to transform the input before validation (e.g. parsing).
 * @returns A callable factory with helper methods for safe parsing and checks.
 */
export function createBrand<BrandType, Param>(
  name: string,
  testFn: (value: unknown) => value is BrandType,
  parseFn?: (value: Param) => unknown,
): BrandFactory<BrandType, Param> {
  function brand(value: Param): BrandType {
    const [_val, err] = tryCatch(() => (parseFn ? parseFn(value as Param) : value));
    if (err) throw new Error(`Error transforming value for ${name}: ${err.message}`);

    if (!testFn(_val)) throw new Error(`"${value}" is not a valid ${name}`);
    return _val as BrandType;
  }

  brand.from = (value: Param): BrandType | undefined => {
    const [_val, err] = tryCatch(() => (parseFn ? parseFn(value as Param) : value));
    if (err) return undefined;

    return testFn(_val) ? (_val as BrandType) : undefined;
  };

  brand.is = (value: unknown): value is BrandType => {
    const _val = tryCatch(() => (parseFn ? parseFn(value as Param) : value))[0] ?? value;
    return testFn(_val);
  };
  return brand;
}
