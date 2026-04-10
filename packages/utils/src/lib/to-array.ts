export function toArray<T>(obj: T | T[] | undefined | null, defaultValue: T[] = []): T[] {
    if (obj === undefined || obj === null) return defaultValue;
    if (Array.isArray(obj)) return obj;
    return [obj];
}

function main() {
    console.log(toArray(1)); // [1]
    console.log(toArray([1, 2, 3])); // [1, 2, 3]
    console.log(toArray(undefined)); // []
    console.log(toArray(null)); // []
    console.log(toArray(undefined, [4, 5])); // [4, 5]
}
