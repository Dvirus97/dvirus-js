# Signals

The `@dvirus-js/utils/signals` package exposes a lightweight reactive system built around `signal`, `computed`, `effect`, `linkedSignal`, `resource`, `batch`, and `untracked`.

## Core concepts

- `signal(initialValue)`: creates a writable reactive value.
- `computed(fn)`: creates a derived signal that recomputes when its dependencies change.
- `effect(fn)`: runs a side effect whenever any read signal changes.
- `linkedSignal(...)`: creates a writable signal that can be explicitly overridden or derived from a source value.
- `resource(...)`: creates a resource handle with `value`, `status`, `error`, and `isLoading` signals.
- `batch(fn)`: coalesces signal notifications during the callback so subscribers react once at the end.
- `untracked(fn)`: runs a callback without tracking dependencies for the current reactive context.

## Basic example

```ts
import { batch, computed, effect, signal } from '@dvirus-js/utils';

const count = signal(0);
const doubled = computed(() => count() * 2);

const effectRef = effect(() => {
  console.log('count=', count(), 'doubled=', doubled());
});

count.set(1);

batch(() => {
  count.set(2);
  count.set(3);
});

effectRef.destroy();
```

## Read-only views and subscriptions

Signals can be exposed as read-only values with `asReadonly()` and observed with `subscribe()`.

```ts
import { signal } from '@dvirus-js/utils';

const name = signal('Ada');
const readOnlyName = name.asReadonly();

const cleanup = readOnlyName.subscribe((value) => {
  console.log(value);
});

name.set('Grace');
cleanup();
```

## Resources

Resources are useful when data is loaded asynchronously.

```ts
import { resource } from '@dvirus-js/utils';

const users = resource({
  loader: async () => {
    const response = await fetch('/api/users');
    return response.json();
  },
});

console.log(users.value());
```

## Notes

- Signals are lazy and only subscribe when they are read in a reactive context.
- `batch()` is especially helpful for updating multiple signals in a single logical step.
- Effects should be destroyed when they are no longer needed to prevent unnecessary work.
