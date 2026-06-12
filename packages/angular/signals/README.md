# Angular Signals Library

This package exposes two entry points:

- `@dvirus-js/angular-signals`: signal utilities and Angular Reactive Forms signal bridges.
- `@dvirus-js/angular-signals/signal-form`: typed signal-based forms with controls, groups, arrays, validators, warnings, and disabled state.

## Install

```bash
npm install @dvirus-js/angular-signals
```

Peer dependencies: `@angular/core`, `@angular/forms`, and `rxjs`.

## Main Exports

- `signalForm`, `formGroup`, `formControl`, `formArray`: build typed signal-based forms.
- `signalFormValidators`: built-in validators like `required`, `email`, `min`, `max`, `minLength`, `maxLength`, `pattern`.
- `controlSignal`, `formGroupSignal`, `formArraySignal`: expose Angular Reactive Forms state as signals.
- `signalDebounce`, `signalMap`, `signalSet`, `signalObject`, `signalNotifier`: general signal utilities.
- `toSignalObj`, `fromSignalObj`, `signalOrValue`, `signalOrFunction`, `writableSignal`, `tryCatch`: low-level helpers.

## Examples

### Signal form

Use `signalForm` to model nested objects and arrays with reactive value, error, warning, touched, dirty, and disabled state.

```ts
import { signalForm, signalFormValidators } from '@dvirus-js/angular-signals/signal-form';

const profileForm = signalForm({
  name: {
    value: '',
    validators: [signalFormValidators.required, signalFormValidators.minLength(2)],
  },
  age: {
    value: 18,
    validators: [signalFormValidators.min(0)],
    warnings: [signalFormValidators.max(120)],
  },
  tags: ['angular', 'signals'],
});

profileForm.controls.name.setValue('Ada');
profileForm.controls.tags.push('forms');

profileForm.value();
profileForm.valid();
profileForm.controls.name.errors();
profileForm.controls.age.firstErrorOrWarning();
```

### Dynamic disabled and cross-field logic

Validators and `disabled` rules can read sibling controls through `getControl`.

```ts
import { signalForm, signalFormValidators } from '@dvirus-js/angular-signals/signal-form';

const accountForm = signalForm({
  role: 'user',
  adminCode: {
    value: '',
    validators: [({ item, getControl }) => (getControl('role').value() === 'admin' && !item.value ? { requiredForAdmin: 'Admin code is required' } : null)],
    disabled: ({ getControl }) => getControl('role').value() !== 'admin',
  },
});

accountForm.controls.role.setValue('admin');
accountForm.controls.adminCode.disabled(); // false
```

### Angular Reactive Forms bridge

Use `controlSignal`, `formGroupSignal`, or `formArraySignal` when you already have `@angular/forms` controls and want signal accessors.

```ts
import { effect } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { controlSignal, formGroupSignal } from '@dvirus-js/angular-signals';

const nameControl = new FormControl('Ada');
const nameSig = controlSignal(nameControl);

effect(() => {
  console.log(nameSig.value(), nameSig.invalid(), nameSig.touched());
});

const form = new FormGroup({
  firstName: new FormControl('Ada'),
  lastName: new FormControl('Lovelace'),
});

const formSig = formGroupSignal(form);
console.log(formSig.controls.firstName.value());
```

### Signal utilities

These helpers cover debounced state, reactive collections, reactive objects, and signal/value conversion.

```ts
import { effect, signal } from '@angular/core';
import { fromSignalObj, signalDebounce, signalMap, signalNotifier, signalObject, signalOrValue, signalSet, toSignalObj } from '@dvirus-js/angular-signals';

const search = signalDebounce({ debounceTime: 300, initialValue: '' });
search.setDebounced('angular');
search.isLoading();

const selected = signalSet<number>();
selected.add(1);
selected.toggle(2);
selected.toArray();

const cache = signalMap<string, number>({ a: 1 });
cache.set('b', 2);
cache.toJSON();

const person = signalObject({ name: 'Ada', age: 36 });
person.name = 'Grace';
person();

const notifier = signalNotifier();
effect(() => {
  notifier();
});
notifier.notify();

const plain = { count: 1, label: 'ready' };
const signalObj = toSignalObj(plain);
const snapshot = fromSignalObj(signalObj);
const count = signalOrValue(signal(5));
console.log(snapshot, count);
```

### Utility helpers

`tryCatch` wraps sync code into `[result, error]`, and `writableSignal` creates a computed-like signal that can still be overridden with `.set()` and `.update()`.

```ts
import { computed, signal } from '@angular/core';
import { tryCatch, writableSignal } from '@dvirus-js/angular-signals';

const [data, error] = tryCatch(() => JSON.parse('{"ok":true}'));

const source = signal(1);
const derived = writableSignal(() => source() * 2);

derived(); // 2
derived.set(10);
source.set(3);
derived(); // 6

console.log(data, error);
```
