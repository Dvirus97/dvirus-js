# React Signals

Signal-style React hooks for readable and writable state, computed values, and async resources.

## Exports

- `Signal<T>`: function-style read-only value accessor.
- `WritableSignal<T>`: mutable signal with `set`, `update`, and `asReadOnly`.
- `useSignalState`: wraps React state in a stable writable signal function.
- `useComputed`: read-only computed signal derived from dependencies.
- `useWritableComputed`: computed signal that also supports manual writes.
- `useResource`: async loader helper with `value`, `isLoading`, `error`, and `reload` signals.
- `isSignalState` and `USE_SIGNAL`: runtime marker/type guard utilities.

## Quick Example

```ts
import * as React from 'react';
import { useComputed, useResource, useSignalState } from '@dvirus-js/react';

function CounterSummary() {
  const count = useSignalState(0);
  const doubled = useComputed(() => count() * 2, [count()]);

  const users = useResource({
    deps: [],
    loader: () => fetch('/api/users').then((r) => r.json() as Promise<string[]>),
    defaultValue: [],
  });

  React.useEffect(() => {
    count.update((v) => v + 1);
  }, []);

  if (users.isLoading()) return <p>Loading...</p>;
  if (users.error()) return <p>Failed to load users</p>;

  return (
    <div>
      <p>Count: {count()}</p>
      <p>Doubled: {doubled()}</p>
      <p>Users: {users.value()?.length ?? 0}</p>
    </div>
  );
}
```

## Notes

- Signal values are read by calling them like functions.
- `useSignalState` and computed hooks preserve a stable function identity.
- `useResource` re-runs when `deps` changes or when `reload` is called.
