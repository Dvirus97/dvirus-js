import { FormControl, FormGroup, FormArray } from '@angular/forms';

// Helper to remove undefined from optional types for FormGroup constraint
type PartialControls<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};

// Helper type for converting a single value to its form control type
type ToFormControl<TValue> = TValue extends (infer U)[]
  ? FormArray<
      U extends object ? FormGroup<PartialControls<ToFormInputs<U>>> : FormControl<U | null>
    >
  : TValue extends object
    ? FormGroup<PartialControls<ToFormInputs<TValue>>>
    : FormControl<TValue | null>;

// Map over object keys making them ALL optional
export type ToFormInputs<TData extends object> = {
  [Key in keyof TData]?: ToFormControl<TData[Key]>;
};

// Alias for the inputs type (all keys optional)
export type ToForm<T extends object> = PartialControls<ToFormInputs<T>>;

function main() {
  // Example Model
  interface Address {
    street: string;
    city: string;
  }

  interface Person {
    name: string;
    age: number;
    address: Address;
    hobbies: string[];
  }

  // ✅ Example usage - all fields optional:
  const personForm = new FormGroup<ToForm<Person>>({
    name: new FormControl('dvirus'),
    address: new FormGroup<ToForm<Address>>({
      street: new FormControl('123 Main St'),
    }),
    hobbies: new FormArray([new FormControl('coding')]),
  });

  console.log(personForm.controls.hobbies?.at(0).value); // coding
}
