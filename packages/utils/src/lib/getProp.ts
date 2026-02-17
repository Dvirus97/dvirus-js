/**
 * A utility type to get the value type at a given path in an object.
 *
 * @template T - The type of the object.
 * @template P - The path as a string.
 */
export type PathValue<T, P extends string> = 
    P extends `${infer K}.${infer Rest}`
        ? K extends keyof T
            ? PathValue<T[K], Rest>
            : undefined
        : P extends keyof T
            ? T[P]
            : undefined;

/**
 * Retrieves the value at a given path in an object.
 *
 * @template T - The type of the object.
 * @template P - The path as a string.
 * @param {T} obj - The object to retrieve the value from.
 * @param {P} path - The path to the value in the object.
 * @returns {PathValue<T, P>} The value at the given path, or undefined if the path is invalid.
 */
export function getProp<T, P extends string>(obj: T, path: P): PathValue<T, P> {
    // getValueAtPath
    if (!path || typeof path !== "string" || typeof obj !== "object" || obj === null) {
        return undefined as PathValue<T, P>;
    }

    const keys = path.split(".");

    function recursiveSearch<O>(keys: string[], currentObj: O): PathValue<T, P> {
        if (!currentObj || typeof currentObj !== "object") {
            return undefined as PathValue<T, P>;
        }

        const key = keys[0] as keyof O;

        if (!(key in currentObj)) {
            return undefined as PathValue<T, P>;
        }

        if (keys.length === 1) {
            return currentObj[key] as PathValue<T, P>;
        }

        return recursiveSearch(keys.slice(1), currentObj[key]);
    }

    return recursiveSearch(keys, obj);
}

// Example usage:
function main() {
    const obj = {
        a: {
            b: {
                c: 42,
                d: "hello",
            },
            e: true,
        },
    };

    // Type inference works! 🎉
    const value1 = getProp(obj, "a.b.c"); // Type: number (42)
    const value2 = getProp(obj, "a.b.d"); // Type: string ('hello')
    const value3 = getProp(obj, "a.e"); // Type: boolean (true)
    const value4 = getProp(obj, "a.b.x"); // Type: undefined (since 'x' doesn't exist)
    const value5 = getProp(obj, "a.b"); // Type: { c: number, d: string }

    console.log(value1, value2, value3, value4, value5);

    const translateJson = {
        general: {
            hello: "Hello",
            world: "World",
        },
        errors: {
            notFound: "Not found",
            internalServerError: "Internal server error",
        },
        name: "Name",
        age: "Age",
    };

    function translate(path: string): string {
        return getProp(translateJson, path) || path;
    }

    const _name = translate("name");
    const _age = translate("age");
    const _hello = translate("general.hello");
    const _notFound = translate("errors.notFound");
    const _notFound2 = translate("errors.notFound2");
    console.log(_name, _age, _hello, _notFound, _notFound2); // Name, Age, Hello, Not found, errors.notFound2
}
