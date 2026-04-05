import {
  DestroyRef,
  inject,
  linkedSignal,
  resource,
  ResourceStreamItem,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { tryCatch } from './try-catch';

/**
 * A writable signal enhanced with debounce capabilities.
 *
 * Extends `WritableSignal<T>` so it can be read and written like a normal signal,
 * but also exposes a `setDebounced` method that applies values after a configurable delay
 * and an `isLoading` signal that indicates whether a debounced update is pending.
 *
 * @typeParam T - The type of the signal's value.
 */
export interface SignalDebounce<T> extends WritableSignal<T> {
  /** Sets the signal value after the configured debounce delay. */
  setDebounced(value: T): void;
  /** Reactive flag that is `true` while a debounced update is pending. */
  isLoading: Signal<boolean>;
}

/**
 * Internal parameter bag shared between `setDebounced` and `getSig` helpers.
 *
 * @typeParam T - The type of the debounced value.
 * @internal
 */
interface _SignalDebounceParams<T> {
  /** The writable signal to push the debounced value into, or `undefined` when no reactive source is provided. */
  signal: WritableSignal<T> | undefined;
  /** Delay in milliseconds before the value is committed. */
  debounceTime: number;
  /** Holds the active `setTimeout` handle so it can be cleared on subsequent calls. */
  timeout: WritableSignal<ReturnType<typeof setTimeout> | null>;
  /** Reactive loading flag toggled around the debounce window. */
  isLoading: WritableSignal<boolean>;
  /** The value to commit once the debounce delay elapses. */
  value: T;
  /** Optional callback executed after the debounced value has been committed. */
  then?: () => void;
}

/**
 * Creates a debounced writable signal.
 *
 * The returned signal can be written to instantly via its `WritableSignal` interface
 * **or** through `setDebounced(value)` which delays the commit by `debounceTime` ms.
 * While a debounced write is pending, `isLoading()` returns `true`.
 *
 * If a reactive `params` function is supplied, the signal will also track that
 * source and debounce upstream changes (requires an injection context).
 *
 * @typeParam T - The type of the signal's value.
 * @param options - Configuration object.
 * @param options.params - Optional reactive source function whose return value
 *   is tracked and debounced into the signal.
 * @param options.debounceTime - Delay in milliseconds before a debounced value
 *   is committed.
 * @param options.initialValue - Optional initial value for the signal.
 * @returns A `SignalDebounce<T>` instance.
 *
 * @example
 * ```ts
 * // Simple debounced signal with an initial value
 * const search = signalDebounce<string>({ debounceTime: 300, initialValue: '' });
 * search.setDebounced('hello'); // commits after 300 ms
 *
 * // Tracking a reactive source
 * const query = signal('angular');
 * const debounced = signalDebounce({ params: () => query(), debounceTime: 500 });
 * ```
 */
export function signalDebounce<T>(options: {
  params?: () => T;
  debounceTime: number;
  initialValue?: T;
}): SignalDebounce<T> {
  const timeout = signal<ReturnType<typeof setTimeout> | null>(null);
  const isLoading = signal(false);

  const _sig = getSig({
    signal: options.params ? linkedSignal(() => options.params?.()) : undefined,
    debounceTime: options.debounceTime,
    timeout: timeout,
    value: options.initialValue,
    isLoading: isLoading,
  });

  const _setDebounced = (value: T): void => {
    setDebounced({
      signal: _sig,
      value,
      timeout,
      debounceTime: options.debounceTime,
      isLoading: isLoading,
    });
  };

  return Object.assign(_sig, {
    setDebounced: _setDebounced,
    isLoading: isLoading,
  }) as SignalDebounce<T>;
}

/**
 * Schedules a debounced write to the target signal.
 *
 * Cancels any previously pending timeout, sets `isLoading` to `true`, and starts
 * a new `setTimeout`. When the timer fires the value is committed to the signal,
 * `isLoading` is reset to `false`, and the optional `then` callback is invoked.
 *
 * @typeParam T - The type of the debounced value.
 * @param params - The internal debounce parameter bag.
 * @internal
 */
function setDebounced<T>(params: _SignalDebounceParams<T>): void {
  const t = params.timeout();
  if (t) {
    clearTimeout(t);
  }
  params.isLoading.set(true);
  const timeout = setTimeout(() => {
    params.isLoading.set(false);
    if (params.value != undefined) {
      params.signal?.set(params.value);
    }
    if (params.then) {
      params.then();
    }
  }, params.debounceTime);

  params.timeout.set(timeout);
}

/**
 * Resolves the underlying writable signal used by `signalDebounce`.
 *
 * - If no reactive source (`options.signal`) is provided, a plain `signal()` is
 *   returned initialized with `options.value`.
 * - If a source is provided but there is no injection context (i.e. `DestroyRef`
 *   cannot be injected), a warning is logged and a plain `signal()` is returned.
 * - Otherwise a `resource`-backed signal is created that tracks upstream changes,
 *   debounces them, and exposes the latest committed value via a `linkedSignal`.
 *
 * @typeParam T - The type of the signal's value.
 * @param options - The internal debounce parameter bag.
 * @returns A `WritableSignal<T>` that reflects the debounced value.
 * @internal
 */
function getSig<T>(options: _SignalDebounceParams<T>): WritableSignal<T> {
  if (!options.signal) {
    return signal(options.value) as WritableSignal<T>;
  }

  if (!isInInjectionContext()) {
    console.error(
      'Warning: signalDebounce is being used outside of an injection context. The debounced signal will not update based on the provided signal.\n\n',
      "Still Can be used with manual value updates via setDebounced, but won't react to changes in the provided signal.",
    );
    return signal(options.value) as WritableSignal<T>;
  }

  const resSignal = signal<ResourceStreamItem<T | undefined>>({
    value: options.value,
  });
  const res = resource({
    params: () => ({ val: options.signal?.() }),
    stream: ({ params }) => {
      setDebounced({
        signal: linkedSignal(() => {
          const _s = resSignal();
          return 'value' in _s ? _s.value : undefined;
        }),
        value: params.val,
        timeout: options.timeout,
        debounceTime: options.debounceTime,
        isLoading: options.isLoading,
        then: () => {
          resSignal.set({ value: params.val });
        },
      });

      return Promise.resolve(resSignal);
    },
  });

  return linkedSignal(() => res.value()) as WritableSignal<T>;
}

/**
 *  Helper function to determine if the current execution context has access to Angular's dependency injection.
 *
 * This is used to conditionally create a resource-backed signal that tracks upstream changes.
 * If there is no injection context (e.g. the function is called outside of a component or service),
 * we fall back to a simple signal and log a warning.
 * @returns A boolean indicating whether the current execution context has access to Angular's dependency injection.
 */
function isInInjectionContext(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, error] = tryCatch(() => inject(DestroyRef));
  return !error;
}
