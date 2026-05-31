import * as React from 'react';
import { useSignalState } from './useSignal';
import type { ResourceRef, UseResourceOptions } from './signals.type';

/**
 * Loads asynchronous data and exposes request state as writable signals.
 *
 * The loader runs on mount, when any `options.deps` value changes, and when
 * `reload()` is called. While running, `isLoading` is set to `true` and `error`
 * is cleared. On success, `value` is updated. On failure, `error` is updated.
 *
 * Stale async resolutions are ignored after cleanup, preventing state writes
 * from outdated requests.
 *
 * @template T Loaded value type.
 * @template E Error type captured in the `error` signal.
 * @param options Resource options:
 * - `loader`: async function that resolves the next value.
 * - `deps`: optional dependency list that triggers reloads.
 * - `defaultValue`: optional initial value before first successful load.
 * @returns Signal-backed resource reference with:
 * - `value`: latest loaded value.
 * - `isLoading`: request in-flight flag.
 * - `error`: latest error value.
 * - `reload`: function to manually trigger a new load.
 *
 * @example
 * const users = useResource({
 *   loader: () => fetch('/api/users').then((r) => r.json() as Promise<User[]>),
 *   deps: [teamId],
 *   defaultValue: [],
 * });
 *
 * if (users.isLoading()) return;
 * const list = users.value() ?? [];
 */
export function useResource<T, E = Error>(
  options: UseResourceOptions<T>,
): ResourceRef<T, E> {
  const value = useSignalState<T | undefined>(options.defaultValue);
  const isLoading = useSignalState(false);
  const error = useSignalState<E | undefined>(undefined);
  const [version, setVersion] = React.useState(0);

  const reload = React.useCallback(() => setVersion((v) => v + 1), []);

  React.useEffect(() => {
    let cancelled = false;

    isLoading.set(true);
    error.set(undefined);

    options
      .loader()
      .then((result) => {
        if (cancelled) return;
        value.set(result);
      })
      .catch((err: E) => {
        if (cancelled) return;
        error.set(err);
      })
      .finally(() => {
        if (!cancelled) isLoading.set(false);
      });

    return () => {
      cancelled = true;
    };
  }, [version, ...(options.deps || [])]);

  return { value, isLoading, error, reload };
}
