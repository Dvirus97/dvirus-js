import * as React from 'react';
import { USE_SIGNAL, type Signal, type WritableSignal } from './signals.type';

/**
 * Internal wrapper that keeps a stable signal function identity.
 */
interface UseSignalWrapper<S> {
  state: WritableSignal<S>;
  setLatest: (next: S) => void;
}

/**
 * Creates a stable writable signal wrapper around React state.
 *
 * The returned `state` function keeps identity stable across renders while
 * reading from an internal `latestState` reference that is refreshed by
 * `setLatest` in the hook body.
 *
 * @template S State value type.
 * @param setState React state setter used by signal mutation helpers.
 * @returns Internal wrapper containing a writable signal and a latest-state sync function.
 */
function createUseSignalWrapper<S>(
  setState: React.Dispatch<React.SetStateAction<S>>,
): UseSignalWrapper<S> {
  let latestState: S;

  return {
    state: Object.assign(() => latestState, {
      [USE_SIGNAL]: true,
      set: (newState: S): void => setState(newState),
      update: (updater: (prevState: S) => S): void => setState(updater),
      asReadOnly: (): Signal<S> => () => latestState,
    }),
    setLatest: (next: S): void => {
      latestState = next;
    },
  };
}

/**
 * React state hook exposed as a writable signal API.
 *
 * Returns a function-style signal with stable identity:
 * - call `signal()` to read the latest value,
 * - call `signal.set(next)` to replace it,
 * - call `signal.update((prev) => next)` to derive the next value,
 * - call `signal.asReadOnly()` to hide mutation methods.
 *
 * This is useful when you want React state ergonomics plus signal-style
 * composability.
 *
 * @template S State value type.
 * @param initVal Initial state value or lazy initializer.
 * @returns Writable signal backed by `React.useState`.
 *
 * @example
 * const count = useSignalState(0);
 * count.update((v) => v + 1);
 * console.log(count()); // 1
 */
export function useSignalState<S>(initVal: S | (() => S)): WritableSignal<S> {
  const [state, setState] = React.useState<S>(initVal);
  const [wrapper] = React.useState<UseSignalWrapper<S>>(() =>
    createUseSignalWrapper(setState),
  );

  // Keep getter reads fresh while preserving function identity.
  wrapper.setLatest(state);

  return wrapper.state;
}
