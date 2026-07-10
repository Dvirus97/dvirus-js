import { effect, signal, Signal, untracked, WritableSignal } from './signals';

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
  /** Destroys the debounced signal, cleaning up any pending timeouts and subscriptions.*/
  destroy: () => void;
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
 * @param options.source - Optional reactive source function whose return value
 *   is tracked and debounced into the signal.
 * @param options.debounceTime - Delay in milliseconds before a debounced value
 *   is committed.
 * @param options.initialValue - Optional initial value for the signal.
 * @param options.injector - Optional Angular `Injector` to use for setting up
 *   reactive tracking. Required if `source` is provided and this function is called
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
 * const debounced = signalDebounce({ source: () => query(), debounceTime: 500 });
 * ```
 */
export function signalDebounce<T>(options: {
  source?: () => T;
  debounceTime: number;
  initialValue?: T;
}): SignalDebounce<T> {
  const timeout = signal<ReturnType<typeof setTimeout> | null>(null);
  const isLoading = signal(false);
  const _sig = signal(options.initialValue) as WritableSignal<T>;
  let destroy: (() => void) | undefined = undefined;

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

  if (options.source) {
    const eRef = effect(() => {
      if (!options.source) return;
      const val = options.source();
      untracked(() => scheduleDebounce(val));
    });
    destroy = eRef.destroy;
  }

  return Object.assign(_sig, {
    setDebounced: scheduleDebounce,
    isLoading: isLoading.asReadonly(),
    destroy: () => {
      destroy?.();
      clearPendingTimeout(timeout);
    },
  }) satisfies SignalDebounce<T>;
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
