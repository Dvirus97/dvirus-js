# Signal utilities for React

This folder contains the React-facing helpers for the signal system exported by `@dvirus-js/react`. It wraps the lower-level primitives from `@dvirus-js/utils/signals` and adds hooks, a reactive rendering component, and configuration helpers for React apps.

## Installation

```bash
npm install @dvirus-js/react react
```

```ts
import { signal, computed, useSignalValue, useComputed, useLinkedSignal, useResource, S, SignalConfigProvider } from '@dvirus-js/react';
```

## What is in this folder?

- `hooks.ts` exposes React hooks for reading and creating signals inside components.
- `components/` contains the reactive `S` component and structural helpers for conditional/list rendering.
- `context/` exposes global and scoped configuration for signal watching behavior.
- `index.ts` is the public entry point and re-exports everything above.

## Core signal primitives

The package re-exports the core primitives from `@dvirus-js/utils/signals`:

- `signal`
- `computed`
- `linkedSignal`
- `resource`
- `effect`
- `untracked`

These primitives are framework-agnostic. The React utilities in this folder make them easy to use inside components.

## React hooks

### `useSignalValue(sig)`

Reads a signal and subscribes the current component to updates. It returns the current value.

```tsx
import { signal, useSignalValue } from '@dvirus-js/react';

const count: WritableSignal<number> = signal(0);

function Counter() {
  const value: number = useSignalValue(count);

  /* count.set(value + 1);  or  count.update(x => x + 1); */
  return <button onClick={() => count.set(value + 1)}>{value}</button>;
}
```

### `useSignal(initialValue, options?)`

Creates a component-scoped writable signal. By default the hook creates the signal and wires it to the component for re-rendering when `watchSignalChange` is enabled. You can disable that behavior with `{ watch: false }`.

```tsx
import { useSignalValue } from '@dvirus-js/react';

function Counter() {
  const count: WritableSignal<number> = useSignalValue(0);

  return <button onClick={() => count.update((value) => value + 1)}>{count()}</button>;
}
```

### `useComputed(fn, options?)`

Creates a computed signal inside a component. The computation is tracked lazily and updates when dependencies change.

```tsx
import { useComputed, useSignalValue } from '@dvirus-js/react';

function DoubleCounter() {
  const count = useSignalValue(0);
  const doubled = useComputed(() => count() * 2);

  return (
    <div>
      <p>{count()}</p>
      <p>{doubled()}</p>
    </div>
  );
}
```

### `useLinkedSignal(...)`

Creates a writable linked signal from either a computation or a linked-signal options object.

```tsx
import { useLinkedSignal } from '@dvirus-js/react';

function NameField() {
  const name = useLinkedSignal(() => 'Anonymous');

  return <input value={name()} onChange={(event) => name.set(event.target.value)} />;
}
```

### `useResource(options, config?)`

Creates and manages a resource instance for async work. It returns a resource reference with signals such as `.value`, `.isLoading`, and `.error`.

```tsx
import { useResource } from '@dvirus-js/react';

function UserProfile({ userId }: { userId: string }) {
  const user = useResource({
    request: () => userId,
    loader: ({ request }) => fetch(`/api/users/${request}`).then((res) => res.json()),
  });

  if (user.isLoading()) {
    return <p>Loading…</p>;
  }

  return <pre>{JSON.stringify(user.value(), null, 2)}</pre>;
}
```

## Reactive rendering with `S`

`S` is a reactive component that can render text, conditionally render branches, render lists, and bind reactive DOM props.

> If a signal is not bound to the component reRendering, then the only way to see changes is with `S` component

### Text rendering

```tsx
import { S, useSignal } from '@dvirus-js/react';

function Greeting() {
  const name = useSignal('World', { watch: false });

  return (
    <h1>
      {/* if name change, only the S component will reRender
      - because signal is function, can also be used like this: <S value={name} /> 
      */}
      Hello <S value={() => name()} />!
    </h1>
  );
}
```

### `AS` Prop

pass `as` prop with a name of a tag (div, span, a, button...) to convert the S comp to an element.

- `as with $if` - ignored (`<S as="div" $if={()=> true}>`)
- `as with $for` - change the wrapper of the list from Fragment (`<></>`) to the element.
- `as with value` - instead of rendering text, the value become an attribute in the element
  - ex: `<S as="input" value={()=>"hello"}>` => `<input value="hello">`
  - ex: `<S as="div" value={()=>"hello"}>` => `<div value="hello">`

```tsx
import { S, useSignal } from '@dvirus-js/react';

function Component() {
  const disabled = useSignal(false, { watch: false });

  return (
    <S as="button" $disabled={disabled} onClick={() => disabled.set(true)}>
      click me!
    </S>
  );
}
```

### Conditional rendering with `$if`

```tsx
import { S, useSignal } from '@dvirus-js/react';

function Banner() {
  const show = useSignal(true, { watch: false });

  return (
    {/*  only the S component and its children will reRender */}
    <S $if={() => show()}>
      <p>Visible</p>
    </S>
  );
}
```

### List rendering with `$for`

- each: the data signal. can also be used like this: `each: items`
- track: use like the `key` prop. if not pass, defaults to index.
- children: function that get the current item, and return element.

```tsx
import { S, useSignal } from '@dvirus-js/react';

function TodoList() {
  const items = useSignal([{ id: 1, label: 'Learn signals' }]);

  return (
    <S
      $for={{
        each: () => items(),
        track: (item) => item.id,
      }}
    >
      {(item) => <li>{item.label}</li>}
    </S>
  );
}
```

### Reactive DOM props

Props that start with `$` are treated as reactive callbacks that receive the current value from the signal system.

- props prefix with `$` receive function as value.
  - $src={()=> 'http://'}
  - $disabled={disabled} // disabled is signal (signal is fn)

```tsx
import { S, useSignal } from '@dvirus-js/react';

function StatusBadge() {
  const isActive = useSignal(true);

  return <S $className={() => (isActive() ? 'active' : 'inactive')} />;
}
```

## Configuration

The signal hooks use a shared configuration object to decide whether they should subscribe to signal changes and trigger React re-renders. You can override the default globally or for a subtree.

```tsx
import { SignalConfigProvider } from '@dvirus-js/react';

function App() {
  return (
    <SignalConfigProvider options={{ watchSignalChange: false }}>
      <MyTree />
    </SignalConfigProvider>
  );
}
```

## Notes

- `useSignalValue` returns the current value of the signal, not a tuple.
- `useSignal` is useful for local state that should not automatically subscribe unless you opt in with `watch: true`.
- `S` is the preferred way to render reactive text, conditionals, and lists without manually wiring subscriptions into the component tree.
