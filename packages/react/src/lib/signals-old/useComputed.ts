import * as React from 'react';
import { USE_SIGNAL, type Signal, type WritableSignal } from './signals.type';

/**
 * Internal mutable container used by computed hooks.
 */
interface ComputedWrapper<T> {
  get: WritableSignal<T>;
  bindNotifyChange: (notify: () => void) => void;
  computeIfNeeded: (compute: () => T, deps: React.DependencyList) => void;

  // readOnlyGet: UseComputed<T>;
  // set: (newValue: T) => void;
  // update: (updater: (prevValue: T) => T) => void;
}

/**
 * Creates a wrapper that stores computed values with signal-style access.
 */
function createComputedWrapper<T>(): ComputedWrapper<T> {
  let latestValue: T;
  let prevDeps: React.DependencyList | null = null;
  let initialized = false;
  let notifyChange: (() => void) | null = null;
  const readOnlyGet: Signal<T> = () => latestValue;

  const setValue = (nextValue: T) => {
    if (!initialized || !Object.is(latestValue, nextValue)) {
      latestValue = nextValue;
      initialized = true;
      notifyChange?.();
    }
  };

  return {
    get: Object.assign(() => latestValue, {
      [USE_SIGNAL]: true,
      set: (newValue: T): void => {
        setValue(newValue);
      },
      update: (updater: (prevValue: T) => T): void => {
        setValue(updater(latestValue));
      },
      asReadOnly: (): Signal<T> => readOnlyGet,
    }),
    // readOnlyGet,
    // set: (newValue: T): void => {
    //     setValue(newValue);
    // },
    // update: (updater: (prevValue: T) => T): void => {
    //     setValue(updater(latestValue));
    // },
    bindNotifyChange: (notify): void => {
      notifyChange = notify;
    },
    computeIfNeeded: (compute, deps): void => {
      if (!initialized || depsChanged(prevDeps, deps)) {
        latestValue = compute();
        prevDeps = [...deps];
        initialized = true;
      }
    },
  };
}

/**
 * Hook that creates and updates a computed wrapper based on dependencies.
 */
function useComputedWrapper<T>(
  compute: () => T,
  deps: React.DependencyList,
): ComputedWrapper<T> {
  const [, setVersion] = React.useState(0);
  const [wrapper] = React.useState<ComputedWrapper<T>>(() =>
    createComputedWrapper<T>(),
  );
  wrapper.bindNotifyChange(() => setVersion((v) => (v > 1000 ? 1 : v + 1)));
  wrapper.computeIfNeeded(compute, deps);

  return wrapper;
}

/**
 * Compares dependency arrays using Object.is semantics.
 */
function depsChanged(
  prevDeps: React.DependencyList | null,
  nextDeps: React.DependencyList,
): boolean {
  if (prevDeps === null || prevDeps.length !== nextDeps.length) return true;

  for (let i = 0; i < nextDeps.length; i += 1) {
    if (!Object.is(prevDeps[i], nextDeps[i])) return true;
  }

  return false;
}

/**
 * Creates a read-only computed signal.
 *
 * The value is lazily recomputed when dependencies change (using `Object.is`
 * comparison semantics), otherwise the previously computed value is reused.
 *
 * This is the safe default when consumers should not be able to mutate the
 * computed value directly.
 *
 * @template T Computed value type.
 * @param compute Pure compute function used to derive the current value.
 * @param deps Dependency list that controls recomputation.
 * @returns A read-only signal function that returns the latest computed value.
 */
export function useComputed<T>(
  compute: () => T,
  deps: React.DependencyList,
): Signal<T> {
  return useWritableComputed(compute, deps).asReadOnly();
}

/**
 * Creates a writable computed signal.
 *
 * The signal starts from `compute()` and recomputes when `deps` change. In
 * addition, callers can manually override the value via `set` or `update`.
 * A later dependency change may replace that manual value with a newly
 * computed result.
 *
 * ### Prefer `useComputed` unless you explicitly need imperative overrides.
 *
 * @template T Computed value type.
 * @param compute Pure compute function used to derive the current value.
 * @param deps Dependency list that controls recomputation.
 * @returns A writable signal with `set`, `update`, and `asReadOnly` methods.
 */
export function useWritableComputed<T>(
  compute: () => T,
  deps: React.DependencyList,
): WritableSignal<T> {
  const wrapper = useComputedWrapper(compute, deps);

  return wrapper.get;
}
