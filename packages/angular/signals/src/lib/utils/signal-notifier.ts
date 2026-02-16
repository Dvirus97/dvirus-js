import { signal } from '@angular/core';

export interface SignalNotifier {
  (): number;
  notify: () => void;
}

export function signalNotifier(): SignalNotifier {
  const _signal = signal(0);

  function get(): number {
    return _signal();
  }

  get.notify = (): void => _signal.update((n) => n + 1);

  return get;
}
