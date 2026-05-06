import {
  computed,
  Signal,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';

/**
 * Type for value equality comparison function
 */
type ValueEqualityFn<T> = (a: T, b: T) => boolean;

/**
 * Creates a `WritableSignal` whose value is derived from a computation function,
 * but can also be overridden manually via `.set()` / `.update()`.
 * When the reactive dependencies inside the computation change, the signal resets to the new derived value.
 *
 * Angular-16 compatible alternative to `linkedSignal` (Angular 19+).
 *
 * @overload
 * @param computation - A computation function that returns the derived value
 * @param options - Optional configuration (equal, debugName)
 * @returns A WritableSignal<D>
 */
export function writableSignal<D>(
  computation: () => D,
  options?: {
    equal?: ValueEqualityFn<D>;
    debugName?: string;
  },
): WritableSignal<D>;

/**
 *  Creates a `WritableSignal` with explicit source tracking and computation.
 *  The `source` function provides the reactive dependencies, and the `computation` function derives the value from the source.
 *  Manual overrides via `.set()` / `.update()` are only valid for the specific source state they were set against.
 *
 *  Angular-16 compatible alternative to `linkedSignal` (Angular 19+).
 * 
 * @overload
 * @param options - Configuration object with source tracking and computation
 * @returns A WritableSignal<D>
 */
export function writableSignal<S, D>(options: {
  source: () => S;
  computation: (source: S, previous?: { source: S; value: D }) => D;
  equal?: ValueEqualityFn<D>;
  debugName?: string;
}): WritableSignal<D>;

export function writableSignal<D, S = unknown>(
  computationOrOptions:
    | (() => D)
    | {
        source: () => S;
        computation: (source: S, previous?: { source: S; value: D }) => D;
        equal?: ValueEqualityFn<D>;
        debugName?: string;
      },
  maybeOptions?: {
    equal?: ValueEqualityFn<D>;
    debugName?: string;
  },
): WritableSignal<D> {
  // Determine if input is a function or options object
  const isFunction = typeof computationOrOptions === 'function';

  if (isFunction) {
    const computation = computationOrOptions as () => D;
    const opts = maybeOptions ?? {};

    // Create a fresh token whenever the source recomputes, even if the value is equal.
    const sourceState = computed(() => ({ value: computation() }), {
      equal: (a, b) =>
        opts.equal ? opts.equal(a.value, b.value) : a.value === b.value,
    });

    // Manual overrides are only valid for the source-state token they were set against.
    const override = signal<{ state: { value: D }; value: D } | undefined>(
      undefined,
    );

    const result = computed<D>(
      () => {
        const state = sourceState();
        const currentOverride = override();
        if (currentOverride !== undefined && currentOverride.state === state) {
          return currentOverride.value;
        }
        return state.value;
      },
      { equal: opts.equal },
    );

    return Object.assign(result, {
      set(v: D): void {
        override.set({ state: untracked(sourceState), value: v });
      },
      update(updater: (value: D) => D): void {
        override.set({
          state: untracked(sourceState),
          value: updater(untracked(result)),
        });
      },
      asReadonly(): Signal<D> {
        return result;
      },
    }) as WritableSignal<D>;
  } else {
    const opts = computationOrOptions as {
      source: () => S;
      computation: (source: S, previous?: { source: S; value: D }) => D;
      equal?: ValueEqualityFn<D>;
      debugName?: string;
    };

    let previousState: { source: S; value: D } | undefined;
    const sourceState = computed(() => ({ value: opts.source() }));
    const override = signal<{ state: { value: D }; value: D } | undefined>(
      undefined,
    );

    const result = computed<D>(
      () => {
        const state = sourceState();

        const currentOverride = override();

        if (
          currentOverride !== undefined &&
          (currentOverride.state as unknown as { value: S }) === state
        ) {
          // Update previous state for next computation
          previousState = { source: state.value, value: currentOverride.value };
          return currentOverride.value;
        }

        const computedValue = opts.computation(state.value, previousState);

        // Update previous state for next computation
        previousState = { source: state.value, value: computedValue };

        return computedValue;
      },
      { equal: opts.equal },
    );

    return Object.assign(result, {
      set(v: D): void {
        override.set({
          state: untracked(sourceState) as unknown as { value: D },
          value: v,
        });
      },
      update(updater: (value: D) => D): void {
        override.set({
          state: untracked(sourceState) as unknown as { value: D },
          value: updater(untracked(result)),
        });
      },
      asReadonly(): Signal<D> {
        return result;
      },
    }) as WritableSignal<D>;
  }
}
