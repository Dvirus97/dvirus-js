import { computed, Signal } from '@angular/core';
import { writableSignal } from './writable-signal';

/**
 * Resolves `T` to itself when it is a valid object key (`string | number | symbol`),
 * otherwise falls back to `string`. Used to type-safe `Record` conversions.
 */
type ToKey<T> = T extends string | number | symbol ? T : string;

/**
 * if an object have Symbol.iterator, treat it as Iterable<[K, V]>
 * @param value Iterable<[K, V]> or Record<ToKey<K>, V>
 * @returns Iterable<[K, V]>
 */
function getIterable<K, V>(
  value: Iterable<[K, V]> | Record<ToKey<K>, V>,
): Iterable<[K, V]> {
  if (Symbol.iterator in Object(value)) {
    return value as Iterable<[K, V]>;
  } else {
    return Object.entries(value as Record<ToKey<K>, V>) as Iterable<[K, V]>;
  }
}

/**
 * A reactive wrapper around a `Map` backed by Angular signals.
 * All mutations produce a new `Map` instance, ensuring signal-based change detection works correctly.
 *
 * @template K The key type. Defaults to `string`.
 * @template V The value type. Defaults to `unknown`.
 */
export interface SignalMap<K = string, V = unknown> {
  /** The current underlying `Map` (read via signal). */
  (): Map<K, V>;
  /** The number of entries in the map (reactive). */
  size: Signal<number>;
  /** A computed signal that returns the map keys as an array. */
  keys: Signal<K[]>;
  /** A computed signal that returns the map values as an array. */
  values: Signal<V[]>;
  /** A computed signal that returns the map entries as an array of `[key, value]` tuples. */
  entries: Signal<[K, V][]>;
  /** Returns the value associated with `key`, or `undefined` if absent. */
  get: (key: K) => V | undefined;
  /** Returns `true` if the map contains the given `key`. */
  has: (key: K) => boolean;
  /** Sets (or overwrites) the value for `key` and returns the updated `Map`. */
  set: (key: K, value: V) => Map<K, V>;
  /** Removes the entry for `key`. Returns `true` if the key existed. */
  delete: (key: K) => boolean;
  /** Removes all entries from the map. */
  clear: () => void;
  /** Returns a human-readable string, e.g. `SignalMap(a => 1, b => 2)`. */
  toString: () => string;
  /** Converts the map to a JSON-compatible object. */
  toJSON: () => Record<ToKey<K>, V>;
}

/**
 * Creates a reactive `SignalMap` backed by Angular signals.
 *
 * Every mutation creates a new `Map`, so Angular's signal equality check triggers updates.
 * Accepts either an iterable of `[key, value]` pairs or a plain object as the initial value.
 *
 * @template K The key type. Defaults to `string`.
 * @template V The value type. Defaults to `unknown`.
 * @param initialValue An optional iterable of entries or a plain object to seed the map.
 * @returns A {@link SignalMap} instance.
 *
 * @example
 * ```ts
 * const cache = signalMap<string, number>({ a: 1, b: 2 });
 * cache.set('c', 3);
 * console.log(cache.keys());   // ['a', 'b', 'c']
 * cache.delete('a');            // true
 * console.log(cache.toJSON());  // {b:2,c:3}
 * ```
 */
export function signalMap<K = string, V = unknown>(
  initialValue:
    | Iterable<[K, V]>
    | Record<ToKey<K>, V>
    | (() => Iterable<[K, V]> | Record<ToKey<K>, V>) = new Map<K, V>(),
): SignalMap<K, V> {
  // writableSignal = linkedSignal 
  const mapSignal = writableSignal(() => {
    const _val =
      typeof initialValue === 'function' ? initialValue() : initialValue;
    const init = getIterable(_val);
    return new Map<K, V>(init);
  });
  const entries = computed(() => Array.from(mapSignal().entries()));
  const keys = computed(() => Array.from(mapSignal().keys()));
  const values = computed(() => Array.from(mapSignal().values()));
  const size = computed(() => mapSignal().size);

  return Object.assign(() => mapSignal(), {
    entries,
    keys,
    values,
    size,
    get: (key: K): V | undefined => mapSignal().get(key),
    has: (key: K): boolean => mapSignal().has(key),
    set: (key: K, value: V): Map<K, V> => {
      mapSignal.update((map) => {
        const next = new Map(map);
        next.set(key, value);
        return next;
      });
      return mapSignal();
    },
    delete: (key: K): boolean => {
      let deleted = false;
      mapSignal.update((map) => {
        const next = new Map(map);
        deleted = next.delete(key);
        return next;
      });
      return deleted;
    },
    clear: (values?: Iterable<[K, V]> | Record<ToKey<K>, V>): void => {
      mapSignal.set(new Map(values ? getIterable(values) : undefined));
    },
    toString: (): string => {
      return `SignalMap(${entries()
        .map(([k, v]) => `${k} => ${v}`)
        .join(', ')})`;
    },
    toJSON: (): Record<ToKey<K>, V> => {
      return Object.fromEntries(entries());
    },
    toObject: (): Record<ToKey<K>, V> => {
      return Object.fromEntries(entries());
    },
  });
}
