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
