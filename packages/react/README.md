# @dvirus-js/react

Lightweight React utilities for class composition, data attributes, signal-style state, and context/service patterns.

## Install

```bash
npm install @dvirus-js/react react
```

## What This Package Includes

- `cx`: tiny className composition helper.
- `toDataAttributes`: converts plain objects to `data-*` props.
- `signals`: function-style state primitives powered by React hooks.
- `context`: context factories and provider registry helpers.

## Exports

```ts
import { cx, toDataAttributes, useSignalState, useComputed, useWritableComputed, useResource, createBaseContext, createBaseContextSignal, createContextService, createContextRegistry } from '@dvirus-js/react';
```

## Quick Start

```tsx
import * as React from 'react';
import { cx, toDataAttributes, useSignalState, useComputed } from '@dvirus-js/react';

export function CounterCard() {
  const count = useSignalState(0);
  const doubled = useComputed(() => count() * 2, [count()]);

  return (
    <div className={cx('card', { 'card--hot': count() > 5 })} {...toDataAttributes({ count: count(), doubled: doubled() })}>
      <p>Count: {count()}</p>
      <p>Doubled: {doubled()}</p>
      <button onClick={() => count.update((n) => n + 1)}>Increment</button>
    </div>
  );
}
```

## API Overview

### `cx(...values)`

Composes class names from strings and conditional maps.

```ts
cx('btn', { 'btn-primary': true, disabled: false }, null);
// => "btn btn-primary"
```

Accepted values:

- `string`
- `false | null | undefined` (ignored)
- `Record<string, boolean | null | undefined>`

### `toDataAttributes(source)`

Converts object entries to `data-*` string attributes. `null` and `undefined` are omitted.

```ts
toDataAttributes({ state: 'active', index: 2, hidden: false, skip: undefined });
// => { 'data-state': 'active', 'data-index': '2', 'data-hidden': 'false' }
```

## Signals

### `useSignalState(initial)`

React state exposed as a writable signal:

- `signal()` reads the current value
- `signal.set(next)` replaces value
- `signal.update(fn)` updates from previous value
- `signal.asReadOnly()` hides mutation methods

```tsx
const count = useSignalState(0);
count.set(10);
count.update((n) => n + 1);
```

### `useComputed(compute, deps)`

Creates a read-only computed signal that recalculates when dependencies change.

```tsx
const total = useComputed(() => items().reduce((a, b) => a + b.price, 0), [items()]);
```

### `useWritableComputed(compute, deps)`

Like `useComputed`, but mutable (`set` and `update` are available).

### `useResource({ loader, deps?, defaultValue? })`

Async resource helper exposing signal-backed request state.

Returned shape:

- `value`: `WritableSignal<T | undefined>`
- `isLoading`: `Signal<boolean>`
- `error`: `Signal<E | undefined>`
- `reload()`: reruns `loader`

```tsx
const users = useResource({
  loader: () => fetch('/api/users').then((r) => r.json() as Promise<User[]>),
  deps: [teamId],
  defaultValue: [],
});
```

## Context Utilities

### `createBaseContext(name, { factory })`

Creates a context backed by React `useState` with:

- `Provider`
- `useContext()` returning `[state, setState]`
- `ValueRenderer` renderer helper

```tsx
const CounterContext = createBaseContext('CounterContext', {
  factory: () => 0,
});

function CountView() {
  const [count, setCount] = CounterContext.useContext();
  return <button onClick={() => setCount((n) => n + 1)}>{count}</button>;
}
```

### `createBaseContextSignal(name, { factory })`

Creates a context backed by a writable signal with:

- `Provider`
- `useContext()` returning `WritableSignal<T>`
- `ValueRenderer` renderer helper

### `createContextService(name, factory)`

Creates a service-style context with a typed `use()` API:

- `use()` throws if called outside provider
- `use({ optional: true })` returns `undefined` outside provider

```tsx
const AuthService = createContextService('AuthService', () => {
  const user = useSignalState<{ id: string; name: string } | null>(null);
  return {
    user,
    login: (name: string) => user.set({ id: crypto.randomUUID(), name }),
    logout: () => user.set(null),
  };
});
```

### `createContextRegistry(providers)`

Composes multiple providers into one.

Order rule:

- first provider = outermost wrapper
- last provider = innermost wrapper

```tsx
const AppRegistry = createContextRegistry([AuthService, ThemeService]);

export function AppProviders({ children }: React.PropsWithChildren) {
  return <AppRegistry.Provider>{children}</AppRegistry.Provider>;
}
```

## Notes

- Peer dependency: `react >= 18`
- Package type: ESM (`"type": "module"`)

## License

MIT
