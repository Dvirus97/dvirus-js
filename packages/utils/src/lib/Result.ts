/**
 * A class representing a result of an operation that can either be a success (ok) or a failure (err).
 * @template T - The type of the success value.
 * @template E - The type of the error value, extending Error.
 */
export class Result<T, E extends Error = Error> {
    #ok: T | null = null;
    #err: E | null = null;

    /**
     * Creates a successful result.
     * @param {T} val - The success value.
     * @returns {Result<T, never>} A Result instance representing a success.
     */
    static ok<T>(val: T): Result<T, never> {
        return new Result<T, never>(val, null);
    }

    /**
     * Creates a failed result.
     * @param {E | string} err - The error value or message.
     * @returns {Result<never, E>} A Result instance representing a failure.
     */
    static err<E extends Error>(err: E | string): Result<never, E> {
        if (typeof err === "string") {
            return new Result<never, E>(null, new Error(err) as E);
        }
        return new Result<never, E>(null, err);
    }

    /**
     * Wraps a promise in a Result.
     * @param {Promise<T>} promise - The promise to wrap.
     * @returns {Promise<Result<T, E>>} A promise that resolves to a Result.
     */
    static async promise<T, E extends Error = Error>(promise: Promise<T>): Promise<Result<T, E>> {
        // try {
        //     const val = await promise;
        //     return Result.ok(val);
        // } catch (error) {
        //     return Result.err(error);
        // }
        return promise.then((v) => Result.ok(v ?? 'void' as T)).catch((e) => Result.err(e));
    }

    /**
     * Wraps a function call in a Result.
     * @param {(...args: any[]) => T} func - The function to call.
     * @param {...any[]} args - The arguments to pass to the function.
     * @returns {Result<T, E>} A Result instance representing the function call result.
     */
    static func<T, E extends Error = Error, TParam extends Array<unknown> = []>(
        func: (...args: TParam) => T,
        ...args: TParam
    ): Result<T, E> {
        try {
            const val = func(...args);
            return Result.ok(val);
        } catch (error ) {
            return Result.err(error as E);
        }
    }

    /**
     * @param {T | null} ok - The success value.
     * @param {E | null} err - The error value.
     * @throws {Error} If both ok and err are provided or neither is provided.
     */
    constructor(ok: T | null, err: E | null) {
        if (!ok && !err) {
            throw new Error("Result must be initialized with either an ok or an err value");
        }
        if (ok && err) {
            throw new Error("Result can't be initialized with both an ok and an err value");
        }
        if (ok != null) {
            this.#ok = ok;
        } else {
            this.#err = err;
        }
    }

    /**
     * Gets the success value, throwing an error if the result is a failure.
     * @returns {T} The success value.
     * @throws {Error} If the result is a failure.
     */
    get value(): T {
        return this.expect("add error handling");
    }

    /**
     * Unwraps the result, returning the success value or throwing the error.
     * @returns {T} The success value.
     * @throws {E} If the result is a failure.
     */
    unwrap(): T {
        if (this.isOk()) {
            return this.#ok as T;
        }
        if (this.isErr()) {
            throw this.#err as E;
        }
        throw new Error("Unknown error");
    }

    /**
     * Unwraps the result, returning the success value or a default value if the result is a failure.
     * @param {T} defaultValue - The default value to return if the result is a failure.
     * @returns {T} The success value or the default value.
     */
    unwrapOr(defaultValue: T): T {
        if (this.isOk()) {
            return this.#ok as T;
        }
        return defaultValue;
    }

    /**
     * Gets the success value, throwing a custom error message if the result is a failure.
     * @param {string} msg - The custom error message.
     * @returns {T} The success value.
     * @throws {Error} If the result is a failure.
     */
    expect(msg: string): T {
        if (this.isOk()) {
            return this.#ok as T;
        }
        if (this.isErr()) {
            const err = this.#err as E;
            throw new Error(msg + ":\n" + err.message);
        }
        throw new Error(msg);
    }

    /**
     * Checks if the result is a success.
     * @returns {boolean} True if the result is a success, false otherwise.
     */
    isOk(): this is Result<T, never> {
        return this.#ok != null;
    }

    /**
     * Checks if the result is a failure.
     * @returns {boolean} True if the result is a failure, false otherwise.
     */
    isErr(): this is Result<never, E> {
        return this.#err != null;
    }

    /**
     * Gets the error value.
     * @returns {E | null} The error value, or null if the result is a success.
     */
    get error(): this extends Result<never, E> ? E : E | null {
        return this.#err as E;
    }
}

// usage
async function main() {
    function divide(a: number, b: number): Result<number> {
        if (b == 0) {
            return Result.err("cannot divide by 0 :(");
        }
        return Result.ok(a / b);
    }
    const result: Result<number> = divide(10, 0);
    if (result.isErr()) {
        console.error(result.error.message);
        return;
    }
    console.log(result.value);

    // ##############################

    async function foo(): Promise<number> {
        if (Math.random() > 0.5) {
            throw new Error("this is error");
        }
        return 5;
    }

    const x: Result<number> = await Result.promise(foo());
    if (x.isErr()) {
        console.error(x.error.message);
        return;
    }
    console.log(x.value);

    // ##############################

    function someFunc(a: number, b: number): number {
        if (b == 0) {
            throw new Error("cannot divide by 0 :(");
        }
        return a / b;
    }

    const y: Result<number> = Result.func(someFunc, 10, 0);
    if (y.isErr()) {
        console.error(y.error.message);
        return;
    }
    console.log(y.value);

    // ##############################

    const aaa = Result.ok({ name: "myName" });
    const aaRes = aaa.unwrapOr({ name: "default" }).name;
    const aaRes2 = aaa.expect("error message").name;
    const aaRes3 = aaa.unwrap().name;
}
