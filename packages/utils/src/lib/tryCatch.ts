/*
// Types for the result object with discriminated union
type Success<T> = {
  data: T;
  error: null;
};

type Failure<E> = {
  data: null;
  error: E;
};

type Result<T, E = Error> = Success<T> | Failure<E>;

// Main wrapper function
export async function tryCatch<T, E = Error>(
  promise: Promise<T>,
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}
*/


/**
 * Types for the result tuple with discriminated union
 * @template T - Type of the successful result
 * @template E - Type of the error, defaults to Error
 */
export type TryResult<T, E = Error> = [T, null] | [null, E];

/**
 * Main wrapper function to handle promise with try-catch
 * @template T - Type of the successful result
 * @template E - Type of the error, defaults to Error
 * @param {Promise<T>} promise - The promise to handle
 * @returns {Promise<TryResult<T, E>>} - A promise that resolves to a tuple with either the result or the error
 */
export async function tryCatch<T, E = Error>(promise: Promise<T>): Promise<TryResult<T, E>> {
    try {
        const val = await promise;
        return [val, null];
    } catch (error) {
        return [null, error as E];
    }
}

// usage
async function main() {
    async function foo() {
        if (Math.random() > 0.5) {
            throw Error("this is error");
        }
        return 5;
    }  
    const [data, error] = await tryCatch(foo());
    if (error) {
        console.log(error?.message);
        return;
    }
    console.log(data);
}
// main();