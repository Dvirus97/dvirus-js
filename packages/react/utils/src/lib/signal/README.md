# Signal Utilities for React

## Installation

```bash
npm install @dvirus-js/react
```

```typescript
import { signal, computed, effect, S, useSignal, useComputed } from '@dvirus-js/react';
```

## License

MIT

## Overview

This package provides a fine-grained reactivity system inspired by frameworks like Angular, designed to work seamlessly with React. It offers signals, computed values, effects, and resources for efficient state management without the overhead of useState/useReducer re-renders for every update.

The core signal implementation is framework-agnostic, but the provided hooks and components are optimized for React integration.

## Core Concepts

### Signals

A `WritableSignal<T>` is a function that holds a value and notifies subscribers when that value changes. It provides:

- Getter: `signal()` returns the current value
- Setter: `signal.set(value)` updates the value
- Updater: `signal.update(fn)` updates via a function
- Subscriber: `signal.subscribe(callback)` returns an unsubscribe function
- Read-only view: `signal.asReadonly()` returns a `Signal<T>` (getter + subscribe)

### Computed

A `computed<T>(fn: () => T): Signal<T>` creates a derived value that automatically updates when its dependencies (signals read inside `fn`) change.

### Effect

An `effect(fn: () => void): () => void` runs a function synchronously whenever its dependencies change and returns a cleanup function.

### Resource

A `resource<T, R>(options: ResourceOptions<T, R>): ResourceRef<T>` manages asynchronous data fetching with built-in loading, error, and reload states.

## API Reference

### Core Functions

#### signal(initialValue: T): WritableSignal<T>

Creates a writable signal.

```ts
const count = signal(0);

// Get value
count(); // 0

// Set value
count.set(5);

// Update with function
count.update((n) => n + 1);

// Subscribe
const unsubscribe = count.subscribe(() => console.log('count changed'));
// Later cleanup
unsubscribe();

// Read-only version
const readonlyCount = count.asReadonly();
readonlyCount(); // works
// readonlyCount.set(5); // Error: Property 'set' does not exist
```

#### computed(fn: () => T): Signal<T>

Creates a computed signal.

```ts
const count = signal(0);
const doubled = computed(() => count() * 2);

console.log(doubled()); // 0
count.set(5);
console.log(doubled()); // 10
```

#### effect(fn: () => void): () => void

Runs an effect and returns a cleanup function.

```ts
const count = signal(0);
const stop = effect(() => {
  console.log(`Count is now ${count()}`);
});

// Later
stop(); // stops the effect
```

#### resource(options: ResourceOptions<T, R>): ResourceRef<T>

Creates a resource for async data.

```ts
interface User { id: number; name: string }

const userResource = resource({
  request: () => userId(),
  loader: ({ request: id, abortSignal }) =>
    const data = fetch('/api/user/${id}');
    return request.then(res => res.json()),
});
```

#### batch(fn: () => void): void

Executes a function while batching all signal updates inside it to prevent multiple notifications.

```ts
const count = signal(0);
const name = signal('');

batch(() => {
  count.set(5);
  name.set('John');
  // Subscribers will only notify once after the batch
});
```

#### untracked<T>(fn: () => T): T

Executes a function without tracking its signal dependencies.

```ts
const count = signal(0);
const name = signal('John');

effect(() => {
  console.log(`Name is ${name()}`); // This effect subscribes to name
  // But we don't want to track count here
  const countValue = untracked(() => count());
  console.log(`Count is ${countValue} (but not tracked)`);
});
```

### React Integration

#### Hooks

##### useSignal(initialValue: T): [WritableSignal<T>, (value: T) => void]

Gets signal and subscribe the component to listen to changes.
Return the value

```tsx
import { useSignal } from './hooks';

const $count = signal(0);

function Counter() {
  const count = useSignal($count);

  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => $count.update((c) => c + 1)}>Increment</button>
    </div>
  );
}
```

##### useReactiveSignal<T>(initialValue: T): WritableSignal<T>

create a local signal and subscribe the component to changes.
uses `signal()` + `useSignal()` under the hood.

```tsx
function Counter() {
  const count = useReactiveSignal(0);

  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => count.update((c) => c + 1)}>Increment</button>
    </div>
  );
}
```

##### useLocalSignal<T>(initialValue: T): WritableSignal<T>

create a local signal and **NOT** subscribe the component.
the component will not reRender for changes.

This kook needs to be used with `S component`.

```tsx
function Counter() {
  const count = useLocalSignal(0);

  return (
    <div>
      <p>
        Count: <S value={count} />
      </p>
      <button onClick={() => count.update((c) => c + 1)}>Increment</button>
    </div>
  );
}
```

##### useComputed<T>(fn: () => T): Signal<T>

Returns a computed signal that automatically updates when its dependencies change.

```tsx
// under the hood:
useMemo(() => computed(computationFn), []);
```

```tsx
import { useSignal, useComputed } from './hooks';

const $count = signal(0);

function DoubleCounter() {
  const doubled = useComputed(() => $count() * 2);

  return (
    <div>
      <p>Count: {$count()}</p>
      <p>Doubled: {doubled()}</p>
      <button onClick={() => $count.set($count() + 1)}>Increment</button>
    </div>
  );
}
```

##### useResource<T, R>(options: ResourceOptions<T, R>): ResourceRef<T>

Returns a resource object for async operations.

```tsx
// under the hood:
useMemo(() => resource(options), []);
```

```tsx
import { useResource } from './hooks';
import { SKIP } from './resource';

// use SKIP symbol to tell the loader to not to run.
// if you do not have reqParams, then return undefined

function UserProfile() {
  const user = useResource({
    request: () => userId() || SKIP,
    loader: ({ request }) => {
      fetch('/api/user').then((x) => x.json());
    },
  });

  if (user.isLoading()) return <p>Loading...</p>;
  if (user.error()) return <p>Error: {String(user.error())}</p>;

  return (
    <div>
      <h1>{user.value()?.name}</h1>
      <p>Email: {user.value()?.email}</p>
      <button onClick={() => user.reload()}>Refresh</button>
    </div>
  );
}
```

#### Components

##### S Component

A smart component that automatically subscribes to signals to change the DOM.
the father component will not reRender.

```tsx
import { S } from './components';
import { useLocalSignal } from './signal';

function Greeting() {
  const name = useLocalSignal('World');
  const isLoggedIn = useLocalSignal(true);

  return (
    <h1>
      {/*
        - Will re-render when name() changes
        - change the DOM directly.
      */}
      Hello, <S value={name}/>!
    </h1>

     {/* Conditional rendering */}
     <S $if={isLoggedIn}>
       <p>Welcome back!</p>
     </S>

      <S
        $style={()=> {
          return {color: isLoggedIn() ? 'green' : 'red'};
        }}
      >
        <h2>log in</h2>
      </S>
  );
}
```

###### Conditional Rendering with `$if`

The `$if` prop expects a signal or function that returns a boolean. When false, children are not rendered.

```tsx
const showMessage = signal(true);

<S $if={showMessage}>
  <p>This message is conditionally shown.</p>
</S>;

// To toggle:
showMessage.set(false); // hides the message
```

###### List Rendering with `$for`

The `$for` prop expects an object with:

- `each`: a signal or function returning an array
- `render`: function(item, index) => ReactNode
- `track` (optional): function(item, index) => string|number for stable keys

```tsx
const items = signal([
  { id: 1, text: 'Learn signals' },
  { id: 2, text: 'Build apps' }
]);

<S $for={{
  each: items,
  render: (item) => <div key={item.id}>{item.text}</div>
}}>
  {/* Optional fallback when list is empty */}
  <p>No items</p>
</S>

// With custom tracking function
<S $for={{
  each: items,
  render: (item) => <div>{item.text}</div>,
  track: (item) => item.id  // use id as key
}}>
  <p>Loading...</p>
</S>
```

## Connection to React

While the core signal implementation (`signal`, `computed`, `effect`, `resource`) is framework-agnostic and can be used with any UI library (or none), the provided React-specific utilities bridge the gap:

### Hooks (`useSignal`, `useComputed`, `useResource`)

- Use `useSyncExternalStore` to subscribe to signal changes and trigger React re-renders.
- `useSignal` returns `WritableSignal`.
- `useComputed` returns a computed signal that can be used in JSX or other hooks.
- `useResource` returns a resource object with signals for data, status, etc.

### Components (`S`, `If`, `For`)

- The `S` component is the cornerstone of reactive rendering in JSX:
  - Automatically tracks signals used in its children via `useComputed` internally
  - Provides `$if` and `$for` props for declarative conditional/list rendering based on signals
  - Eliminates manual dependency arrays in `useEffect` for signal-based rendering

### Effects

- The core `effect` function runs synchronously when signals change, outside React's render cycle.
- For side effects that need to align with React's lifecycle (e.g., subscriptions, DOM mutations), use `useEffect` with signals:

  ```tsx
  useEffect(() => {
    const subscription = someSignal.subscribe(updateSomething);
    return () => subscription.unsubscribe();
  }, [someSignal]); // Note: This resubscribes when someSignal changes (rarely needed)
  ```

  ```tsx
  useEffect(() => {
    const clean = effect(() => {
      const val = someSignal();
      // do something
    });

    return () => {
      clean();
    };
  }, []); // run once and listen in signal world
  ```

  For most cases, prefer wrapping side effects in `effect()` and calling it in `useEffect` with an empty deps array if the effect should persist for the component's lifetime.
