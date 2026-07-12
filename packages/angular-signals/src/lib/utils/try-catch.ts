/**
 * Types for the result tuple with discriminated union
 * @template T - Type of the successful result
 * @template E - Type of the error, defaults to Error
 */
type TryResult<T, E = Error> = [T, null] | [null, E];

/**
 * Main wrapper function to handle promise with try-catch
 * @template T - Type of the successful result
 * @template E - Type of the error, defaults to Error
 * @param {()=> T} fn - The function to handle
 * @returns {TryResult<T, E>} - A tuple with either the result or the error
 */
export function tryCatch<T, E = Error>(fn: () => T): TryResult<T, E> {
  try {
    const val = fn();
    return [val, null];
  } catch (error) {
    return [null, error as E];
  }
}
