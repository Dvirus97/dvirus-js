/**
 * Marker symbol used to identify writable signal wrappers.
 */
export const USE_SIGNAL: unique symbol = Symbol('SIGNAL');

/**
 * Runtime type guard that checks whether a value is a signal.
 */
export function isSignalState<T>(val: unknown): val is Signal<T> {
  return typeof val === 'function' && USE_SIGNAL in val;
}

/**
 * Read-only function-style signal.
 * Call the function to read the current value.
 */
export interface Signal<S> {
  (): S;
}

/**
 * Writable signal with mutation helpers.
 */
export interface WritableSignal<S> extends Signal<S> {
  /** Replace the current value. */
  set: (newState: S) => void;
  /** Update the current value from its previous value. */
  update: (updater: (prevState: S) => S) => void;
  /** Get a read-only view of this signal. */
  asReadOnly: () => Signal<S>;
}

/**
 * Options for the asynchronous resource hook.
 */
export interface UseResourceOptions<T> {
  /** Dependency list used to re-run the loader. */
  deps?: React.DependencyList;
  /** Async loader that resolves the resource value. */
  loader: () => Promise<T>;
  /** Optional initial value before the first load resolves. */
  defaultValue?: T;
}

/**
 * Reactive references returned by the resource hook.
 */
export interface ResourceRef<T, E = Error> {
  /** Current resource value. */
  value: WritableSignal<T | undefined>;
  /** Tracks whether a request is in-flight. */
  isLoading: Signal<boolean>;
  /** Last request error when present. */
  error: Signal<E | undefined>;
  /** Triggers a manual reload. */
  reload: () => void;
}
