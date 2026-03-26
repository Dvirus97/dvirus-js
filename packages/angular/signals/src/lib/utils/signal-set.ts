import { computed, Signal, signal } from '@angular/core';

/**
 * A reactive wrapper around a `Set` backed by Angular signals.
 * All mutations produce a new `Set` instance, ensuring signal-based change detection works correctly.
 *
 * @template T The type of elements stored in the set. Defaults to `number`.
 */
export interface SignalSet<T = number> {
  /** The current underlying `Set` (read via signal). */
  value: Set<T>;
  /** The number of elements in the set (reactive). */
  size: number;
  /** A computed signal that returns the set contents as an array. */
  toArray: Signal<T[]>;
  /** Adds the element if absent, removes it if present. */
  toggle: (id: T) => void;
  /** Returns `true` if the element exists in the set. */
  has: (id: T) => boolean;
  /** Adds an element to the set. */
  add: (id: T) => void;
  /** Removes an element from the set. */
  delete: (id: T) => void;
  /** Removes all elements from the set. */
  clear: () => void;
  /** Returns a human-readable string representation, e.g. `SignalSet(1, 2, 3)`. */
  toString: () => string;
  /** Converts the set to a JSON-compatible array. e.g. `[1, 2, "a"]` */
  toJSON: () => T[];
}

/**
 * Creates a reactive `SignalSet` backed by Angular signals.
 *
 * Every mutation creates a new `Set`, so Angular's signal equality check triggers updates.
 *
 * @template T The element type. Defaults to `number`.
 * @param initialValue An optional iterable to seed the set with.
 * @returns A {@link SignalSet} instance.
 *
 * @example
 * ```ts
 * const selected = signalSet<number>();
 * selected.add(1);
 * selected.toggle(2);
 * console.log(selected.toArray()); // [1, 2]
 * selected.toggle(1);
 * console.log(selected.has(1));    // false
 * ```
 */
export function signalSet<T = number>(initialValue: Iterable<T> = new Set<T>()): SignalSet<T> {
  const setSignal = signal(new Set(initialValue));
  const toArray = computed(() => Array.from(setSignal()));

  return {
    toArray,
    get value(): Set<T> {
      return setSignal();
    },
    get size(): number {
      return setSignal().size;
    },
    toggle: (id: T): void => {
      setSignal.update((set) => {
        const next = new Set(set);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    has: (id: T): boolean => setSignal().has(id),
    add: (id: T): void => {
      setSignal.update((set) => {
        const next = new Set(set);
        next.add(id);
        return next;
      });
    },
    delete: (id: T): void => {
      setSignal.update((set) => {
        const next = new Set(set);
        next.delete(id);
        return next;
      });
    },
    clear: (): void => {
      setSignal.set(new Set());
    },
    toString: (): string => {
      return `SignalSet(${toArray().join(', ')})`;
    },
    toJSON: (): T[] => {
      return toArray();
    },
  };
}
