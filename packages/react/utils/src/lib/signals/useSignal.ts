import * as React from 'react';
import { USE_SIGNAL, type Signal, type WritableSignal } from './signals.type';

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
  // 1. Keep the raw values and subscribers in a mutable ref box
  const storeRef = React.useRef<{
    value: S;
    version: number;
    listeners: Set<() => void>;
  }>({
    value: typeof initVal === 'function' ? (initVal as () => S)() : initVal,
    version: 0,
    listeners: new Set(),
  });

  const subscribe = React.useCallback((callback: () => void) => {
    storeRef.current.listeners.add(callback);
    return () => storeRef.current.listeners.delete(callback);
  }, []);

  // 2. Track an incremental version number to hook into React's render lifecycle
  const version = React.useSyncExternalStore(
    subscribe,
    () => storeRef.current.version,
  );

  // 3. Re-create the wrapper identity ONLY when the version ticks.
  // This forces the compiler to break cache, and lets standard hooks track dependencies perfectly.
  return React.useMemo(() => {
    const getter = () => storeRef.current.value;

    return Object.assign(getter, {
      [USE_SIGNAL]: true,

      set: (newState: S): void => {
        storeRef.current.value = newState;
        storeRef.current.version++; // Ticks version to trigger the useMemo update
        storeRef.current.listeners.forEach((cb) => cb());
      },

      update: (updater: (prevState: S) => S): void => {
        storeRef.current.value = updater(storeRef.current.value);
        storeRef.current.version++;
        storeRef.current.listeners.forEach((cb) => cb());
      },

      asReadOnly: (): Signal<S> => getter,
    });
  }, [version]); // 👈 The magic dependency that updates the outer wrapper identity
}

// export function useSignalState<S>(initVal: S | (() => S)): WritableSignal<S> {
//   // 1. Dummy state purely to trigger React renders
//   const [counter, forceRender] = React.useState(0);

//   // 2. We use useState's lazy-initializer function to create our Signal.
//   // This function runs EXACTLY ONCE when the component mounts.
//   const [signal] = React.useState(() => {
//     let internalValue =
//       typeof initVal === 'function' ? (initVal as () => S)() : initVal;

//     function trigger() {
//       forceRender((n) => {
//         if (n >= 1000) return 1;
//         return n + 1;
//       });
//     }

//     // The core getter function reads the closure variable
//     const getter = () => {
//       void counter;
//       return internalValue;
//     };

//     // Build the object
//     const sig = Object.assign(getter, {
//       [USE_SIGNAL]: true,
//       set: (newState: S): void => {
//         internalValue = newState; // Update memory instantly
//         trigger(); // Tell React to render
//       },

//       update: (updater: (prevState: S) => S): void => {
//         internalValue = updater(internalValue); // Update memory instantly
//         trigger(); // Tell React to render
//       },
//       asReadOnly: (): Signal<S> => getter,
//     });
//     return sig;
//   });

//   // 3. Return the stable signal object
//   return signal;
// }
