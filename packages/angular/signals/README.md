# Angular Signals Reactive Forms Library

This package provides a type-safe, reactive forms library for Angular, built on top of Angular Signals. It enables the creation of deeply nested, reactive form structures with strong typing, validation, and state management, inspired by Angular's classic Reactive Forms but fully signal-based.

## Features
- **Type-safe forms**: All form structures are strongly typed.
- **Signal-based reactivity**: Built on Angular Signals for fine-grained reactivity.
- **Validation and warnings**: Built-in support for validators and warnings.
- **Nested groups and arrays**: Compose forms from deeply nested objects and arrays.
- **Dynamic state**: Controls can be dynamically enabled/disabled, validated, and updated.

## Library Structure

- **signal-form/**: Core form logic, including controls, groups, arrays, types, and validators.
  - `array.ts`: Implements signal-based form arrays.
  - `control.ts`: Implements signal-based form controls (primitives).
  - `errors.ts`: Utilities for validation error handling.
  - `form.ts`: Implements signal-based form groups (objects).
  - `types.ts`: Type definitions for all form structures and validators.
  - `validators.ts`: Built-in validator functions (required, min, max, etc.).
  - `index.ts`: Exports all main form APIs and includes usage examples.
- **utils/**: Utility types and helpers for signals and objects.
  - `object-type.ts`: Generic object type utility.
  - `signal-notifier.ts`: Signal-based notification utility.
  - `signals.utils.ts`: Helpers for working with signals and signal objects.
  - `signal-debounce.ts`: Writable signal with built-in debounce support and loading state.
  - `signal-set.ts`: Reactive `Set` wrapper backed by Angular signals.
  - `signal-map.ts`: Reactive `Map` wrapper backed by Angular signals.
  - `signal-object.ts`: Reactive object proxy where each property is a signal.
  - `control-signal.ts`: Bridges Angular Reactive Forms controls to signals (value, status, events).
  - `try-catch.ts`: Synchronous try/catch wrapper returning a `[result, error]` tuple.
- **directives/**: Angular directives for signal-based UI behaviors.
  - `click-outside.directive.ts`: Emits an event when a click occurs outside the host element or a group of elements.

## Usage Example

```typescript
import { signalForm, signalFormValidators } from '@your-scope/signals';

const form = signalForm({
  name: 'dvirus',
  age: {
    value: 30,
    validators: [signalFormValidators.required, signalFormValidators.min(0)],
    warnings: [signalFormValidators.max(120)],
  },
  address: {
    street: { value: '123 Main St', validators: [signalFormValidators.required] }
  },
  hobbies: [
    { value: 'coding', validators: [signalFormValidators.minLength(3)] },
    'programming'
  ]
});

// Access form state
form.getControl('address').value(); // { street: '123 Main St' }
form.controls.hobbies.controls()[0].errors(); // {}
form.controls.age.firstErrorOrWarning(); // { name: 'max', message: 'To big', type: 'warning' }
```

## Utils Usage Examples

### `object-type.ts`

```typescript
import { ObjectType } from '@dvirus-js/angular/signals';

const obj: ObjectType = { foo: 123, bar: 'abc' };
// Use ObjectType for generic object utilities
```

### `signal-notifier.ts`

```typescript
import { signalNotifier } from '@dvirus-js/angular/signals';

const notifier = signalNotifier();
effect(()=>{
    notifier(); // listen to changes
});
notifier.notify(); // increments count and notifies listeners
```

### `signals.utils.ts`

```typescript
import { toSignalObj, fromSignalObj, signalOrValue, SignalOrValue } from '@dvirus-js/angular/signals';

const plain = { a: 1, b: 'x' };
const signals = toSignalObj(plain); // { a: WritableSignal<number>, b: WritableSignal<string> }
const values = fromSignalObj(signals); // { a: 1, b: 'x' }

// signalOrValue unwraps signals or value into value
const maybeSignal1: SignalOrValue<number> = 5;
const maybeSignal2: SignalOrValue<number> = signal(3);
const value1 = signalOrValue(maybeSignal1); // 5
const value2 = signalOrValue(maybeSignal2); // 3

```

### `signal-debounce.ts`

```typescript
import { signalDebounce } from '@dvirus-js/angular/signals';

const search = signalDebounce<string>({ debounceTime: 300, initialValue: '' });
search.setDebounced('hello'); // commits after 300 ms
search.isLoading();           // true while pending
```

### `signal-set.ts`

```typescript
import { signalSet } from '@dvirus-js/angular/signals';

const selected = signalSet<number>();
selected.add(1);
selected.toggle(2);
console.log(selected.toArray()); // [1, 2]
selected.toggle(1);
console.log(selected.has(1));    // false
// automatically works with JSON.stringify()
console.log(cache.toJSON()); // [1, 2]

```

### `signal-map.ts`

```typescript
import { signalMap } from '@dvirus-js/angular/signals';

const cache = signalMap<string, number>({ a: 1, b: 2 });
cache.set('c', 3);
console.log(cache.keys());   // ['a', 'b', 'c']
cache.delete('a');            // true
// automatically works with JSON.stringify()
console.log(cache.toJSON()); // { b: 2, c: 3 }
```

### `signal-object.ts`

```typescript
import { signalObject } from '@dvirus-js/angular/signals';

const person = signalObject({ name: 'dvirus', age: 30 });
person.name;              // 'dvirus' (tracked by Angular reactivity)
person['name'] = 'new';   // triggers reactive update
const snapshot = person(); // { name: 'new', age: 30 } reactive
```

### `control-signal.ts`

```typescript
import { controlValueSignal } from '@dvirus-js/angular/signals';
import { FormControl } from '@angular/forms';

const ctrl = new FormControl('hello');
const $ctrl$ = controlSignal(ctrl); // ControlSignal<string> that tracks ctrl changes

effect(()=>{
  $ctrl.value() // reactive
  // $ctrl: value, valid, invalid, touched, dirty, errors, disabled
})
```

### `try-catch.ts`

```typescript
import { tryCatch } from '@dvirus-js/angular/signals';

const [result, error] = tryCatch(() => JSON.parse('{"a":1}'));
if (error) { /* handle error */ }
else { console.log(result); } // { a: 1 }
```

## Directives Usage Example

### `click-outside.directive.ts`

```html
<!-- Listen for clicks outside this div (and any group elements) -->
<div (clickOutside)="onClickOutside($event)">
  ...
</div>
```

```typescript
// In your component:
onClickOutside(event: MouseEvent): void {
  // Handle the outside click (e.g., close a popup)
}
```

---

This library was generated with [Nx](https://nx.dev).
