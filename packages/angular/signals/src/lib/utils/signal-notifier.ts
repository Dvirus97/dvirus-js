import { signal } from '@angular/core';

/**
 * A function interface for a signal-based notification mechanism.
 * Calling the function returns the current notification count.
 * Calling `notify()` increments the count, triggering any listeners.
 */
export interface SignalNotifier {
  (): number;
  /**
   * Triggers a notification by incrementing the internal signal value.
   */
  notify: () => void;
}

/**
 * Creates a signal-based notifier function.
 *
 * Each call to the returned function returns the current notification count.
 * Calling `notify()` increments the count, triggering any listeners.
 *
 * @returns {SignalNotifier} A notifier function with a `notify` method.
 *
 * @example
 * const notifier = signalNotifier();
 * effect(() => {
 *   notifier(); // Reacts to notifications
 * });
 * notifier.notify(); // Triggers the effect
 */
export function signalNotifier(): SignalNotifier {
  const _signal = signal(0);

  function get(): number {
    return _signal();
  }

  get.notify = (): void => _signal.update((n) => n + 1);

  return get;
}
