import { useSyncExternalStore } from 'react';
import { Action, Func } from '@dvirus-js/utils';

/**
 * Function returned by subscriptions to unsubscribe.
 */
export type CleanupFn = Action;

/**
 * General callback function for subscriptions.
 */
export type CallbackFn = Action;

/**
 * Callback function for slice subscriptions, providing the specific key and value that changed.
 */
export type SliceCallbackFn<T> = (
  ...args: { [K in keyof T]: [key: K, value: T[K]] }[keyof T]
) => void;

/**
 * A mapping function used for selectors.
 */
export type MapFn<T, R> = Func<R, [T]>;

/**
 * The base interface for a state container.
 */
export interface BaseStore<T> {
  /**
   * Returns the current state.
   */
  get: Func<T>;
  /**
   * Updates the state with a new value or an updater function.
   */
  set: (nextState: T | Func<T, [T]>) => void;
}

/**
 * An extended store interface providing React integration and granular subscription methods.
 */
export interface GlobalStore<T> extends BaseStore<T> {
  /**
   * A React hook to access and subscribe to the store state.
   * @param selector - An optional function to transform or select a piece of the state.
   */
  useStore: <Out = T>(selector: MapFn<T, Out>) => Out;

  /**
   * Subscribes to any state change.
   * @returns A cleanup function to unsubscribe.
   */
  subscribe: (callback: CallbackFn) => CleanupFn;

  /**
   * Subscribes to changes in any top-level property (slice) of the state.
   * @returns A cleanup function to unsubscribe.
   */
  subscribeToSlice: (callback: SliceCallbackFn<T>) => CleanupFn;

  /**
   * Subscribes to changes of a specific key in the state.
   * @param key - The property key to watch.
   * @returns A cleanup function to unsubscribe.
   */
  subscribeToKey: <K extends keyof T>(
    key: K,
    callback: (value: T[K]) => void,
  ) => CleanupFn;
}

/**
 * Creates a global store for managing state outside of the React component tree
 * while providing a hook for synchronization.
 *
 * @param initialState - The initial value of the store.
 * @returns An object implementing the GlobalStore interface.
 */
export function createGlobalStore<T>(initialState: T): GlobalStore<T> {
  let currentState = initialState;
  let prevState = initialState;

  const listeners = new Set<CallbackFn>();
  const sliceListeners = new Set<SliceCallbackFn<T>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keyListeners = new Map<keyof T, Set<Action<[any]>>>();

  /**
   * Internal method to notify all relevant subscribers based on which parts of the state changed.
   */
  function notify() {
    // Notify general listeners
    listeners.forEach((cb) => cb());

    // Check for shallow changes in keys to notify slice and key-specific listeners
    for (const key in currentState) {
      if (currentState[key] !== prevState[key]) {
        if (sliceListeners.size > 0) {
          sliceListeners.forEach((cb) => cb(key, currentState[key]));
        }

        const specificKeyListeners = keyListeners.get(key);
        if (specificKeyListeners) {
          specificKeyListeners.forEach((cb) => cb(currentState[key]));
        }
      }
    }

    prevState = currentState;
  }

  /**
   * Implementation of the general subscription.
   */
  function subscribe(callback: CallbackFn) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  /**
   * Implementation of the slice-level subscription.
   */
  function subscribeToSlice(callback: SliceCallbackFn<T>) {
    sliceListeners.add(callback as SliceCallbackFn<T>);
    return () => sliceListeners.delete(callback as SliceCallbackFn<T>);
  }

  /**
   * Implementation of the key-specific subscription.
   */
  function subscribeToKey<K extends keyof T>(key: K, callback: Action<[T[K]]>) {
    if (!keyListeners.has(key)) {
      keyListeners.set(key, new Set());
    }

    keyListeners.get(key)?.add(callback);

    return () => {
      const set = keyListeners.get(key);
      if (!set) return;
      set.delete(callback);
      if (set.size === 0) keyListeners.delete(key);
    };
  }

  /**
   * Internal snapshot getter for useSyncExternalStore.
   */
  const getSnapshot = () => currentState;

  /**
   * Updates the store state and triggers notifications.
   */
  const setState = (nextState: T | Func<T, [T]>) => {
    currentState =
      typeof nextState === 'function'
        ? (nextState as (prev: T) => T)(currentState)
        : nextState;

    notify();
  };

  /**
   * Hook implementation using useSyncExternalStore to bind React components to the store.
   */
  const useStore = <Out = T>(
    selector: MapFn<T, Out> = (state) => state as unknown as Out,
  ): Out => {
    return useSyncExternalStore(subscribe, () => selector(currentState));
  };

  return {
    useStore,
    set: setState,
    get: getSnapshot,
    subscribe,
    subscribeToSlice,
    subscribeToKey,
  };
}

/**
 * Creates a scoped 'slice' of a store, allowing read/write access to just one property of the parent store.
 *
 * @param store - The parent BaseStore to slice.
 * @param key - The key of the parent store to manage.
 * @returns A BaseStore interface scoped to the specific key.
 */
export function createSlice<T, K extends keyof T>(
  store: BaseStore<T>,
  key: K,
): BaseStore<T[K]> {
  return {
    /**
     * Returns the value of the specific key from the parent store.
     */
    get: () => store.get()[key],

    /**
     * Updates the specific key in the parent store while preserving the rest of the state.
     */
    set: (valueOrUpdater: T[K] | ((currentSlice: T[K]) => T[K])) => {
      store.set((currentState) => {
        const nextSliceValue =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as (currentSlice: T[K]) => T[K])(
                currentState[key],
              )
            : valueOrUpdater;

        return {
          ...currentState,
          [key]: nextSliceValue,
        };
      });
    },
  };
}
