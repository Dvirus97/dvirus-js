export interface ObjectParserOptions {
  /** Whether to include undefined values in the serialized output. Defaults to true. */
  includeUndefined?: boolean;
  /** Whether to include reference IDs for circular references. Defaults to false. */
  withRefs?: boolean;
  /** Whitespace to use for formatting the output. Passed to JSON.stringify. */
  space?: number | string;
}

/** Type representing a JSON-like value that can be serialized. */
type JsonLike =
  | string
  | number
  | boolean
  | null
  | JsonLike[]
  | { [key: string]: JsonLike };

/** Type representing any function. */
type AnyFunction = (...args: unknown[]) => unknown;

/**
 * Type that represents the result of deserializing a value of type T.
 * This type maps special types (like Date, Set, Map, etc.) to their deserialized counterparts.
 */
export type DeserializeResult<T> = T extends AnyFunction
  ? string
  : T extends symbol
    ? string
    : T extends Date
      ? Date
      : T extends Set<infer U>
        ? Set<DeserializeResult<U>>
        : T extends Map<infer K, infer V>
          ? Map<DeserializeResult<K>, DeserializeResult<V>>
          : T extends readonly (infer U)[]
            ? DeserializeResult<U>[]
            : T extends object
              ? {
                  [K in keyof T]: DeserializeResult<T[K]>;
                }
              : T;

export interface DeserializeOptions<T = unknown> {
  /**
   * Optional runtime validator. If provided and it returns false,
   * deserialize will throw a TypeError.
   */
  validate?: (value: unknown) => value is DeserializeResult<T>;
}

/**
 * Determines whether a value should be included in the serialization based on the includeUndefined flag.
 * @param value - The value to check.
 * @param includeUndefined - If true, undefined values are included; otherwise, they are excluded.
 * @returns True if the value should be included, false otherwise.
 */
function shouldIncludeValue(
  value: unknown,
  includeUndefined: boolean,
): boolean {
  if (includeUndefined) return true;
  return value !== undefined;
}

/**
 * Normalizes a value to a JSON-like representation, handling special types and circular references.
 * @param value - The value to normalize.
 * @param includeUndefined - Whether to include undefined values.
 * @param withRefs - Whether to include reference IDs for circular references.
 * @param seen - A map tracking objects that have been seen to detect circular references.
 * @param nextId - An object with a value property that is the next available ID for referencing.
 * @returns A JSON-like representation of the value, or undefined if the value should be skipped.
 */
function normalizeValue(
  value: unknown,
  includeUndefined: boolean,
  withRefs: boolean,
  seen: WeakMap<object, { id: number; processing: boolean }>,
  nextId: { value: number },
): JsonLike | undefined {
  if (value === undefined) {
    return includeUndefined ? { __type: 'Undefined' } : undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return { __type: 'NaN' };
    }
    if (value === Infinity) {
      return { __type: 'Infinity' };
    }
    if (value === -Infinity) {
      return { __type: '-Infinity' };
    }
    return value;
  }

  if (typeof value === 'bigint') {
    return {
      __type: 'BigInt',
      value: value.toString(),
    };
  }

  if (typeof value === 'function') {
    return {
      __type: 'Function',
      value: value.name || 'anonymous',
    };
  }

  if (typeof value === 'symbol') {
    return {
      __type: 'Symbol',
      value: String(value),
    };
  }

  if (value instanceof Date) {
    return {
      __type: 'Date',
      value: value.toISOString(),
    };
  }

  if (value instanceof Set) {
    const normalizedValues: JsonLike[] = [];
    for (const item of value) {
      if (!shouldIncludeValue(item, includeUndefined)) continue;
      const normalizedItem = normalizeValue(
        item,
        includeUndefined,
        withRefs,
        seen,
        nextId,
      );
      if (normalizedItem !== undefined) {
        normalizedValues.push(normalizedItem);
      }
    }

    return {
      __type: 'Set',
      value: normalizedValues,
    };
  }

  if (value instanceof Map) {
    const normalizedEntries: JsonLike[] = [];
    for (const [key, mapValue] of value.entries()) {
      if (
        !shouldIncludeValue(key, includeUndefined) ||
        !shouldIncludeValue(mapValue, includeUndefined)
      ) {
        continue;
      }

      const normalizedKey = normalizeValue(
        key,
        includeUndefined,
        withRefs,
        seen,
        nextId,
      );
      const normalizedMapValue = normalizeValue(
        mapValue,
        includeUndefined,
        withRefs,
        seen,
        nextId,
      );

      if (normalizedKey !== undefined && normalizedMapValue !== undefined) {
        normalizedEntries.push([normalizedKey, normalizedMapValue]);
      }
    }

    return {
      __type: 'Map',
      value: normalizedEntries,
    };
  }

  if (Array.isArray(value)) {
    const normalizedArray: JsonLike[] = [];
    for (const item of value) {
      if (!shouldIncludeValue(item, includeUndefined)) continue;
      const normalizedItem = normalizeValue(
        item,
        includeUndefined,
        withRefs,
        seen,
        nextId,
      );
      if (normalizedItem !== undefined) {
        normalizedArray.push(normalizedItem);
      }
    }
    return normalizedArray;
  }

  if (typeof value === 'object') {
    const trackedObj = seen.get(value as object);

    if (trackedObj) {
      if (withRefs) {
        return {
          __type: 'Ref',
          value: trackedObj.id,
        };
      } else {
        return {
          __type: 'Ref',
          value: '__UNRESOLVED_CIRCULAR_REF__',
        };
      }
    }

    const objId = withRefs ? nextId.value++ : undefined;
    seen.set(value as object, { id: objId ?? -1, processing: true });

    const normalizedObject: { [key: string]: JsonLike } = {};
    if (withRefs && objId !== undefined) {
      normalizedObject['__id'] = objId;
    }

    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (!shouldIncludeValue(nestedValue, includeUndefined)) continue;
      const normalizedNestedValue = normalizeValue(
        nestedValue,
        includeUndefined,
        withRefs,
        seen,
        nextId,
      );
      if (normalizedNestedValue !== undefined) {
        normalizedObject[key] = normalizedNestedValue;
      }
    }

    const tracked = seen.get(value as object);
    if (tracked) {
      tracked.processing = false;
    }

    return normalizedObject;
  }

  return value as JsonLike;
}

/**
 * Revives a normalized JSON-like value back to its original form, restoring special types and circular references.
 * @param value - The normalized value to revive.
 * @param objectMap - A map used to track object IDs for circular reference resolution.
 * @returns The revived value.
 */
function reviveValue(
  value: unknown,
  objectMap: Map<number, unknown> = new Map(),
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => reviveValue(item, objectMap));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<'__type' | '__id' | 'value', unknown>;

    if (record.__type === 'Ref' && typeof record.value === 'number') {
      return objectMap.get(record.value) ?? null;
    }

    if (record.__type === 'Undefined') {
      return undefined;
    }

    if (record.__type === 'NaN') {
      return Number.NaN;
    }

    if (record.__type === 'Infinity') {
      return Infinity;
    }

    if (record.__type === '-Infinity') {
      return -Infinity;
    }

    if (record.__type === 'BigInt' && typeof record.value === 'string') {
      return BigInt(record.value);
    }

    if (record.__type === 'Date' && typeof record.value === 'string') {
      return new Date(record.value);
    }

    if (record.__type === 'Function') {
      return `[Function ${typeof record.value === 'string' ? record.value : 'anonymous'}]`;
    }

    if (record.__type === 'Symbol') {
      return typeof record.value === 'string' ? record.value : 'Symbol()';
    }

    if (record.__type === 'Set' && Array.isArray(record.value)) {
      return new Set(record.value.map((item) => reviveValue(item, objectMap)));
    }

    if (record.__type === 'Map' && Array.isArray(record.value)) {
      const entries = record.value.map((entry) => {
        if (!Array.isArray(entry) || entry.length !== 2) {
          return [entry, undefined] as const;
        }

        const [key, mapValue] = entry;
        return [
          reviveValue(key, objectMap),
          reviveValue(mapValue, objectMap),
        ] as const;
      });

      return new Map(entries);
    }

    const objId = typeof record.__id === 'number' ? record.__id : undefined;
    const revivedObject: Record<string, unknown> = {};

    if (objId !== undefined) {
      objectMap.set(objId, revivedObject);
    }

    for (const [key, nestedValue] of Object.entries(record)) {
      if (key === '__id' || key === '__type') continue;
      revivedObject[key] = reviveValue(nestedValue, objectMap);
    }
    return revivedObject;
  }

  return value;
}

/**
 * Serializes a value to a JSON string, handling special types and circular references.
 * @param input - The value to serialize.
 * @param options - Options for serialization.
 * @returns A JSON string representing the input value.
 */
export function serialize<T>(
  input: T,
  options: ObjectParserOptions = {},
): string {
  const { includeUndefined = true, withRefs = false, space = 0 } = options;

  const seen = new WeakMap<object, { id: number; processing: boolean }>();
  const nextId = { value: 0 };
  const normalized = normalizeValue(
    input,
    includeUndefined,
    withRefs,
    seen,
    nextId,
  );

  if (normalized === undefined) {
    return 'null';
  }

  return JSON.stringify(normalized, null, space);
}

/**
 * Deserializes a JSON string back to its original value, restoring special types and circular references.
 * @param value - The JSON string to deserialize.
 * @param options - Options for deserialization.
 * @returns The deserialized value.
 */
export function deserialize<T = unknown>(
  value: string,
  options: DeserializeOptions<T> = {},
): DeserializeResult<T> {
  const parsed = JSON.parse(value) as unknown;
  const revived = reviveValue(parsed) as DeserializeResult<T>;

  if (options.validate && !options.validate(revived)) {
    throw new TypeError('Deserialized value failed type validation');
  }

  return revived;
}