import {
  DestroyRef,
  effect,
  inject,
  Injector,
  Signal,
  signal,
  untracked,
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
 * @param options.injector - Optional Angular `Injector` to use for setting up
 *   reactive tracking. Required if `params` is provided and this function is called
 *   outside of an injection context.
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
  injector?: unknown;
}): SignalDebounce<T> {
  const timeout = signal<ReturnType<typeof setTimeout> | null>(null);
  const isLoading = signal(false);
  const _sig = signal(options.initialValue) as WritableSignal<T>;

  const scheduleDebounce = (value: T): void => {
    clearPendingTimeout(timeout);
    isLoading.set(true);
    timeout.set(
      setTimeout(() => {
        isLoading.set(false);
        _sig.set(value);
      }, options.debounceTime),
    );
  };

  if (options.params) {
    trackSource(options.params, scheduleDebounce, timeout, options.injector as Injector);
  }

  return Object.assign(_sig, {
    setDebounced: scheduleDebounce,
    isLoading: isLoading.asReadonly(),
  }) as SignalDebounce<T>;
}

/**
 * Clears a pending debounce timeout if one exists.
 * @internal
 */
function clearPendingTimeout(
  timeout: WritableSignal<ReturnType<typeof setTimeout> | null>,
): void {
  const t = timeout();
  if (t) clearTimeout(t);
}

/**
 * Sets up an effect that tracks a reactive source and debounces its changes.
 *
 * Requires an Angular injection context. If called outside one, logs a warning
 * and returns without setting up tracking (manual `setDebounced` still works).
 *
 * @typeParam T - The type of the source value.
 * @param source - Reactive function to track.
 * @param scheduleDebounce - Callback that schedules a debounced write.
 * @param timeout - Shared timeout handle for cleanup on destroy.
 * @internal
 */
function trackSource<T>(
  source: () => T,
  scheduleDebounce: (value: T) => void,
  timeout: WritableSignal<ReturnType<typeof setTimeout> | null>,
  injector?: Injector,
): void {
  if (!isInInjectionContext() && !injector) {
    console.error(
      'Warning: signalDebounce is being used outside of an injection context. The debounced signal will not update based on the provided signal.\n\n',
      "Still can be used with manual value updates via setDebounced, but won't react to changes in the provided signal.",
    );
    return;
  }

  const _injector = injector ?? inject(Injector);
  const destroyRef = _injector.get(DestroyRef) ?? inject(DestroyRef);

  effect(() => {
    const val = source();
    untracked(() => scheduleDebounce(val));
  }, { injector: _injector });

  destroyRef.onDestroy(() => clearPendingTimeout(timeout));
}

/**
 * Checks if the current execution context has access to Angular's dependency injection.
 * @returns `true` when inside an injection context, `false` otherwise.
 * @internal
 */
function isInInjectionContext(): boolean {
  const [, error] = tryCatch(() => inject(DestroyRef));
  return !error;
}
