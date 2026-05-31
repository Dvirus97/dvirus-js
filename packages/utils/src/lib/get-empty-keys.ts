/**
 * Returns the keys whose values are considered empty.
 *
 * Empty values are:
 * - empty string (`''`)
 * - `null`
 * - `undefined`
 *
 * @template T Object type to inspect.
 * @param obj Object to scan.
 * @returns Array of keys from `obj` whose values are empty.
 *
 * @example
 * getEmptyKeys({ title: '', count: 0, note: undefined });
 * // ['title', 'note']
 */
export function getEmptyKeys<T extends object>(obj: T): (keyof T)[] {
  return (Object.keys(obj) as (keyof T)[]).filter((key) => {
    const value = obj[key];
    return value === '' || value === null || value === undefined;
  });
}

/**
 *  Joins an array of strings into a human-readable sentence.
 *
 * Example:
 * ```ts
 * joinToSentence(["Title", "Content"])           //  "Title and Content"
 * joinToSentence(["Title", "Content", "Author"]) //  "Title, Content and Author"
 * ```
 * @param arr - Array of strings to join
 * @returns A human-readable sentence
 */
export function joinToSentence(arr: string[]): string {
  if (arr.length === 0) return '';
  if (arr.length === 1) {
    const [first] = arr;
    if (!first) return '';
    return first;
  }
  return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
}
