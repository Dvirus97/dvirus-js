/**
 * Represents a general action function that takes arguments and returns void.
 */
export type Action<T extends unknown[] = []> = (...args: T) => void;

/**
 * Represents a general function that takes arguments and returns a result.
 */
export type Func<TResult, TArgs extends unknown[] = []> = (
  ...args: TArgs
) => TResult;
