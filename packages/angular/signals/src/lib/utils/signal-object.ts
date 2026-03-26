import { computed, signal, Signal, WritableSignal } from '@angular/core';

const SIGNAL_OBJECT = Symbol('SignalObject');

/**
 * A reactive object backed by Angular signals.
 * Each property is stored as a WritableSignal, so reads are tracked
 * by Angular's reactive system (templates, computed, effect).
 *
 * Usage:
 *   const person = signalObject({ name: 'dvirus', age: 30 });
 *   person.name;              // reads the signal → 'dvirus' (tracked)
 *   person['name'] = 'new';   // sets the signal (triggers reactivity)
 *   person.age;               // reads the signal → 30 (tracked)
 */
class _SignalObject<T extends Record<string, unknown>> {
  readonly [SIGNAL_OBJECT] = true;
  readonly #signals = new Map<string, WritableSignal<unknown>>();
  readonly #version = signal(0);
  readonly #boundCache = new Map<string | symbol, _Function>();

  constructor(initialValue: T) {
    for (const [key, value] of Object.entries(initialValue)) {
      this.#signals.set(key, signal(value));
    }

    // Use a function as the proxy target so the `apply` trap works (makes it callable).
    // All traps delegate to `self` (the real class instance) for property/signal access.

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const callable = (() => {}) as unknown as this;

    return new Proxy(callable, {
      apply(): T {
        return self.$snapshot();
      },

      get(_, prop): unknown {
        // Symbols & class own members go through normally
        if (typeof prop === 'symbol' || prop in self) {
          const value = Reflect.get(self, prop, self);
          // Bind methods to the real target so private fields (#signals) work.
          // Cache the bound function so the same reference is returned each time
          // (important for Angular signal identity tracking on $snapshot).
          if (typeof value === 'function') {
            let bound = self.#boundCache.get(prop);
            if (!bound) {
              bound = value.bind(self) as _Function;
              self.#boundCache.set(prop, bound);
            }
            return bound;
          }
          return value;
        }
        // Read the signal — this is tracked by Angular's reactive context
        return self.#signals.get(prop)?.();
      },

      set(_, prop, value): boolean {
        if (typeof prop === 'symbol' || prop in self) {
          return Reflect.set(self, prop, value);
        }
        const existing = self.#signals.get(prop);
        if (existing) {
          existing.set(value);
        } else {
          // Dynamic property — create a new signal and bump version
          self.#signals.set(prop, signal(value));
          self.#version.update((v) => v + 1);
        }
        return true;
      },

      has(_, prop): boolean {
        if (typeof prop === 'string' && self.#signals.has(prop)) {
          return true;
        }
        return Reflect.has(self, prop);
      },

      ownKeys(): string[] {
        return Array.from(self.#signals.keys());
      },

      getOwnPropertyDescriptor(_, prop): PropertyDescriptor | undefined {
        if (typeof prop === 'string' && self.#signals.has(prop)) {
          return {
            configurable: true,
            enumerable: true,
            writable: true,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            value: self.#signals.get(prop)!(),
          };
        }
        return Reflect.getOwnPropertyDescriptor(self, prop);
      },
    }) as unknown as this;
  }

  /**
   * A computed signal that returns a plain snapshot of all properties.
   * Reading this tracks ALL properties — so any property change triggers reactivity.
   *
   * Usage:
   *   effect(() => console.log(person.$snapshot()));
   *   // logs whenever ANY property changes
   */
  private readonly $snapshot: Signal<T> = computed(() => {
    this.#version(); // track structural changes (new/removed props)
    return this.toJSON();
  });

  /**
   * Spreads one or more objects (plain or reactive) into this SignalObject.
   * Mimics `Object.assign(this, ...sources)` / `{ ...this, ...a, ...b }`.
   *
   * - Existing keys → updates the signal (triggers reactivity)
   * - New keys → creates a new signal and bumps the version
   * - Accepts plain objects and ReactiveObjects interchangeably
   *
   * @example
   *   const person = signalObject({ name: 'dvirus' });
   *   person.$assign({ age: 30 }, otherSignalObj);
   */
  $assign(...sources: object[]): void {
    for (const source of sources) {
      const entries = isSignalObject(source)
        ? Object.entries((source as unknown as { $snapshot: Signal<object> }).$snapshot())
        : Object.entries(source);

      for (const [key, value] of entries) {
        const existing = this.#signals.get(key);
        if (existing) {
          existing.set(value);
        } else {
          this.#signals.set(key, signal(value));
        }
      }
    }
    this.#version.update((v) => v + 1);
  }

  toJSON(): T {
    const result: Record<string, unknown> = {};
    for (const [key, sig] of this.#signals) {
      result[key] = sig();
    }
    return result as T;
  }

  toString(): string {
    return JSON.stringify(this.toJSON());
  }
}

/**
 * Creates a reactive object backed by Angular signals.
 *
 * Every property is stored as a `WritableSignal`. Reading a property
 * (e.g. `obj.name` or `obj['name']`) calls the signal — so it's
 * automatically tracked in templates, `computed()`, and `effect()`.
 * Setting a property calls `signal.set()`, which triggers reactivity.
 *
 * @example
 * // In a component:
 * protected person = signalObject({ name: 'dvirus', age: 30 });
 *
 * // In the template (reactive — updates automatically):
 * // {{ person.name }}
 *
 * // In the class:
 * // person.name = 'changed';   → triggers re-render
 * // person['age'] = 31;        → triggers re-render
 */
export type SignalObject<T> = T & {
  /**
   * Call the SignalObject as a function to get a reactive snapshot.
   *
   * @example
   * const person = signalObject({ name: 'dvirus', age: 30 });
   * person(); // { name: 'dvirus', age: 30 } — tracked by Angular
   */
  (): T;

  /**
   * A computed signal that returns a plain snapshot of all properties.
   * Reading this tracks ALL properties — any property change triggers reactivity.
   *
   * @example
   * effect(() => console.log(person.$snapshot()));
   * // logs whenever ANY property changes
   *
   * const label = computed(() => {
   *   const snap = person.$snapshot();
   *   return `${snap.name} (${snap.age})`;
   * });
   */
  // readonly $snapshot: Signal<T>;

  /**
   * Spreads one or more objects (plain or reactive) into this SignalObject.
   * Mimics `Object.assign(this, ...sources)` / `{ ...this, ...a, ...b }`.
   *
   * - Existing keys → updates the signal (triggers reactivity)
   * - New keys → creates a new signal and bumps the version
   * - Accepts plain objects and SignalObjects interchangeably
   *
   * @param sources - One or more plain objects or SignalObjects to merge in
   *
   * @example
   * const person = signalObject({ name: 'dvirus' });
   * person.$assign({ age: 30 }, otherSignalObj);
   */
  $assign(...sources: Partial<T>[]): void;
};

/**
 * Creates a reactive object backed by Angular signals.
 *
 * Every property is stored as a `WritableSignal`. Reading a property
 * (e.g. `obj.name` or `obj['name']`) calls the signal — so it's
 * automatically tracked in templates, `computed()`, and `effect()`.
 * Setting a property calls `signal.set()`, which triggers reactivity.
 *
 * @param initialValue - The plain object to make reactive
 * @returns A `SignalObject<T>` proxy with reactive property access, `$snapshot`, and `$assign`
 *
 * @example
 * // In a component:
 * protected person = signalObject({ name: 'dvirus', age: 30 });
 *
 * // In the template (reactive — updates automatically):
 * // {{ person.name }}
 *
 * // In the class:
 * person.name = 'changed';   // triggers re-render
 * person['age'] = 31;        // triggers re-render
 *
 * // Spread (plain snapshot):
 * const copy = { ...person }; // { name: 'changed', age: 31 }
 *
 * // Track all properties reactively:
 * effect(() => console.log(person.$snapshot()));
 */
export function signalObject<T extends object>(initialValue: T): SignalObject<T> {
  return new _SignalObject(initialValue as Record<string, unknown>) as unknown as SignalObject<T>;
}

/**
 * Type guard — checks if a value is a reactive SignalObject proxy.
 *
 * @example
 * isSignalObject(signalObject({ a: 1 })); // true
 * isSignalObject({ a: 1 });               // false
 * isSignalObject({ ...signalObject({ a: 1 }) }); // false (spread = plain copy)
 */
export function isSignalObject<T extends Record<string, unknown>>(
  value: unknown,
): value is SignalObject<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<symbol, unknown>)[SIGNAL_OBJECT] === true
  );
}

/**
 * Reactively merges multiple SignalObjects (like `{ ...a, ...b }`).
 * Returns a `Signal` that re-evaluates whenever any source property changes.
 * Later sources win on key conflicts, just like spread.
 *
 * same as `computed(() => ({ ...a, ...b }))`
 * but with proper tracking of nested properties and support for non-reactive objects as sources.
 *
 * @example
 * const objA = signalObject({ name: 'dvirus', role: 'dev' });
 * const objB = signalObject({ age: 30, role: 'admin' });
 * const merged = mergeSignalObjects(objA, objB);
 * merged(); // { name: 'dvirus', role: 'admin', age: 30 }
 */
export function mergeSignalObjects<T extends object[]>(
  ...sources: [...{ [K in keyof T]: T[K] | SignalObject<T[K]> }]
): Signal<UnionToIntersection<T[number]>> {
  return computed(() => {
    let result = {};
    for (const source of sources) {
      // Spreading a SignalObject triggers its Proxy traps (ownKeys + getOwnPropertyDescriptor),
      // which reads every signal — so it's automatically tracked by Angular's reactive context.
      // Plain objects are just spread normally.
      result = { ...result, ...source };
    }
    return result as UnionToIntersection<T[number]>;
  });
}

/**
 * Extracts the plain object type `U` from a `SignalObject<U>`.
 * Returns `T` as-is if it's not a `SignalObject`.
 */
// type SnapshotOf<T> = T extends SignalObject<infer U> ? U : T;

/**
 * Converts a union of types into an intersection.
 * Used to merge multiple object types from `mergeSignalObjects` into a single combined type.
 *
 * @example
 * // UnionToIntersection<{ a: 1 } | { b: 2 }> → { a: 1 } & { b: 2 }
 */
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

type _Function = (...args: unknown[]) => unknown;
