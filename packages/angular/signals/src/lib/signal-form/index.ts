export * from './array';
export * from './control';
export * from './form';
export * from './types';
export * from './validators';

/**
 * Example demonstrating the usage of signal-based reactive forms.
 *
 * Shows various features including:
 * - Simple value initialization
 * - Validators that mark controls as invalid
 * - Warnings that don't affect validity
 * - Dynamic disabled state based on other controls
 * - Nested objects and arrays
 * - Type-safe control access
 *
 * This function is exported as an example and reference implementation.
 * It's not meant to be called in production code.
 *
 * @example
 * ```typescript
 * // Basic usage pattern from the example
 * const form = signalForm<Person>({
 *   name: 'dvirus',
 *   age: {
 *     value: 130,
 *     validators: [signalFormValidators.required, signalFormValidators.min(0)],
 *     warnings: [signalFormValidators.max(120)],
 *     disabled: (ctx) => ctx.getControl('name').value() === 'admin'
 *   },
 *   address: {
 *     street: { value: '123 Main St', validators: [signalFormValidators.required] }
 *   },
 *   hobbies: [
 *     { value: 'coding', validators: [signalFormValidators.minLength(3)] },
 *     'programming'
 *   ]
 * });
 *
 * // Access form state
 * form.getControl('address').value(); // { street: '123 Main St' }
 * form.controls.hobbies.controls()[0].errors(); // {}
 * form.controls.age.firstErrorOrWarning(); // { name: 'max', message: 'To big', type: 'warning' }
 * ```
 */
// function main() {
//   type Person = {
//     name: string;
//     age: number;
//     address: {
//       street: string;
//       city: string;
//     };
//     hobbies: string[];
//   };

//   /**
//    * Example 1: Simple form with direct value initialization.
//    *
//    * Creates a form from a plain object. Each property becomes
//    * a control with the provided value.
//    */
//   const model1: Person = {
//     name: 'dvirus',
//     age: 30,
//     address: {
//       street: '123 Main St',
//       city: 'Any-town',
//     },
//     hobbies: ['coding', 'gaming'],
//   };

//   const form1 = signalForm(model1);

//   /**
//    * Example 2: Advanced form with validators, warnings, and dynamic disabled state.
//    *
//    * Demonstrates:
//    * - Simple value for name field
//    * - Age control with validators (required, min) and warnings (max)
//    * - Dynamic disabled logic based on name value
//    * - Nested address object with validated street field
//    * - Array of hobbies with mixed control configs and simple values
//    */
//   const form2 = signalForm<Person>({
//     name: 'dvirus',
//     age: {
//       // initial value
//       value: 130,
//       // example of validators, they add error messages and mark the control as invalid if the validation fails
//       validators: [signalFormValidators.required, signalFormValidators.min(0)],
//       // warning are like validators but they don't make the control invalid, just add a warning message
//       warnings: [signalFormValidators.max(120)],
//       // example of dynamic disabling based on another control's value
//       disabled: (ctx) => ctx.getControl('name').value() === 'admin',
//     },
//     address: {
//       street: {
//         value: '123 Main St',
//         validators: [signalFormValidators.required],
//         disabled: false,
//       },
//     },
//     hobbies: [
//       {
//         value: 'coding',
//         validators: [signalFormValidators.minLength(3)],
//         disabled: computed(() => false),
//       },
//       'programming',
//       'Typing',
//     ],
//   });

//   // Example outputs demonstrating form access patterns
//   console.log(form2.getControl('address').value()); // { street: '123 Main St' }
//   console.log(form2.controls.hobbies.controls()[0].errors()); // {}
//   console.log(form2.controls.age.firstErrorOrWarning()); // {name: 'minLength', message: 'To big', type: 'warning'}
//   console.log(form2.controls.age.warnings()); // { minLength: 'To big' }
// }
