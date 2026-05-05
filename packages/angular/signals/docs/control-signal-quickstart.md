# controlSignal quickstart

Short guide for:
- `controlSignal`
- `formGroupSignal`
- `formArraySignal`
- cleanup (`DestroyRef` / injection context / manual `unsubscribe`)

## 1) Single control

```ts
import { FormControl, Validators } from '@angular/forms';
import { controlSignal } from '@dvirus-js/angular-signals';

const emailControl = new FormControl('', [Validators.required, Validators.email]);
const email = controlSignal(emailControl);

email.value();            // current value
email.valid();            // true | false
email.touchedAndInvalid();
email.firstErrorKey();    // 'required' | 'email' | null
```

## 2) FormGroup

```ts
import { FormControl, FormGroup } from '@angular/forms';
import { formGroupSignal } from '@dvirus-js/angular-signals';

const form = new FormGroup({
  name: new FormControl(''),
  age: new FormControl<number | null>(null),
});

const group = formGroupSignal(form);

group.value();                 // { name: string | null, age: number | null }
group.controls.name.value();   // child control signal
group.controls.age.invalid();
```

## 3) FormArray

```ts
import { FormArray, FormControl } from '@angular/forms';
import { formArraySignal } from '@dvirus-js/angular-signals';

const tags = new FormArray([
  new FormControl('angular'),
  new FormControl('signals'),
]);

const array = formArraySignal(tags);

array.value();           // string[]
array.controls[0].value();
array.controls[1].dirty();
```

## 4) Cleanup / unsubscribe logic

### A) In injection context (auto cleanup)

If you call inside an Angular component/directive/service context, cleanup is automatic.

```ts
@Component({...})
export class ProfileComponent {
  nameCtrl = new FormControl('');
  nameSig = controlSignal(this.nameCtrl); // auto cleanup on destroy
}
```

### B) Outside injection context: pass `DestroyRef`

```ts
import { DestroyRef, inject } from '@angular/core';

@Component({...})
export class ProfileComponent {
  private destroyRef = inject(DestroyRef);

  setup(control: FormControl<string | null>) {
    return controlSignal(control, { destroyRef: this.destroyRef });
  }
}
```

### C) No injection context and no `DestroyRef`: manual cleanup

```ts
const sig = controlSignal(new FormControl('x'));

// ...use it...

sig.unsubscribe();
```

## 5) Rule of thumb

- Use `controlSignal` for one control.
- Use `formGroupSignal` for object-like forms.
- Use `formArraySignal` for list-like forms.
- Prefer auto cleanup (injection context) or pass `DestroyRef`.
- Use manual `unsubscribe()` only as fallback.
