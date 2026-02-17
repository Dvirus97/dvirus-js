import {FormControl, FormGroup, FormArray} from '@angular/forms';

export type ToFormModel<T> = {
  [K in keyof T]: T[K] extends Array<infer U>
    ? FormArray<U extends object ? FormGroup<ToFormModel<U>> : FormControl<U | null>>
    : T[K] extends object
      ? FormGroup<ToFormModel<T[K]>>
      : FormControl<T[K] | null>;
};

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};


function main() {
  type ToForm<T> = DeepPartial<ToFormModel<T>>;

// Example Model
  interface Person {
    name: string;
    age: number;
    address: {
      street: string;
      city: string;
    };
    hobbies: string[];
  }

// Apply the transformation
  type PersonForm = ToForm<Person>;

  const a: PersonForm = {
    name: new FormControl(),
    address: new FormGroup({
      street: new FormControl(''),
      city: new FormControl(''),
    }),
    hobbies: new FormArray([new FormControl('')]),
    age: new FormControl(0),
  };

  /*
  PersonForm will be:
  {
    name: FormControl<string>;
    age: FormControl<number>;
    address: FormGroup<{
      street: FormControl<string>;
      city: FormControl<string>;
    }>;
    hobbies: FormArray<FormControl<string>>;
  }
  */

// ✅ Example usage in an Angular FormGroup:
// const personForm = new FormGroup<PersonForm>({
//   name: new FormControl(''),
//   age: new FormControl(0),
//   address: new FormGroup({
//     street: new FormArray([]),
//     city: new FormControl(''),
//   }),
//   hobbies: new FormArray([new FormControl('')]),
// });
}
