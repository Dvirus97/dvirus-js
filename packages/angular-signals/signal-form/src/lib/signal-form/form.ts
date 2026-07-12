import { computed, signal } from '@angular/core';

import { createSignalFormArray, isSignalFormArray } from './array';
import { createSignalFormControl, isSignalFormControl } from './control';
import { hasErrors, isEmptyErrorTree } from './errors';
import {
  SignalForm,
  SignalFormArray,
  SignalFormControl,
  SignalFormControlConfig,
  SignalFormControlInput,
  SignalFormControlLike,
  SignalFormDisableOptions,
  SignalFormErrorFor,
  SignalFormInput,
  SignalFormInputs,
  SignalFormSetValueOptions,
  SignalFormValueFor,
} from './types';

/**
 * Internal type for accessing controls within a form group.
 * 
 * @internal
 */
type ControlAccessor<TControls extends object> = <Key extends keyof TControls>(
  controlName: Key,
) => SignalFormControlLike<TControls[Key]>;

/**
 * Set of valid keys for control configuration objects.
 * Used to distinguish config objects from plain value objects.
 * 
 * @internal
 */
const CONTROL_CONFIG_KEYS = new Set([
  'value',
  'validators',
  'warnings',
  'disabled',
]);

/**
 * Checks if a value is a control configuration object.
 * 
 * Determines if the value has a 'value' property and only contains
 * valid control config keys (value, validators, warnings, disabled).
 * 
 * @internal
 * @param value - Value to check
 * @returns True if value is a control config object
 */
function isControlConfig(
  value: unknown,
): value is SignalFormControlConfig<unknown, object> {
  if (!value || typeof value !== 'object') return false;
  if (!('value' in (value as Record<string, unknown>))) return false;
  return Object.keys(value as Record<string, unknown>).every(key =>
    CONTROL_CONFIG_KEYS.has(key),
  );
}

/**
 * Creates the appropriate control node from various input types.
 * 
 * Recursively determines and creates the correct control type:
 * - Existing controls are returned as-is
 * - Arrays become SignalFormArray
 * - Objects (non-config) become SignalForm (group)
 * - Primitives/configs become SignalFormControl
 * 
 * @internal
 * @template TValue - The type of value to create a control for
 * @template TControls - Object type defining available sibling controls
 * @param input - Input value in any accepted format
 * @param getControl - Accessor for sibling controls
 * @returns Appropriate control type for the input
 */
function createNodeFromInput<TValue, TControls extends object>(
  input: SignalFormInput<TValue, TControls>,
  getControl: ControlAccessor<TControls>,
): SignalFormControlLike<TValue> {
  if (isSignalFormControl<TValue>(input)) {
    return input as SignalFormControlLike<TValue>;
  }
  if (isSignalFormGroup<object>(input)) {
    return input as SignalFormControlLike<TValue>;
  }
  if (isSignalFormArray<TValue>(input)) {
    return input as SignalFormControlLike<TValue>;
  }
  if (Array.isArray(input)) {
    return createSignalFormArray(
      input as SignalFormInput<TValue, TControls>[],
      getControl,
    ) as SignalFormControlLike<TValue>;
  }
  if (typeof input === 'object' && input !== null && !isControlConfig(input)) {
    return createSignalFormGroup(
      input as SignalFormInputs<TValue & object>,
    ) as SignalFormControlLike<TValue>;
  }
  return createSignalFormControl(
    input as SignalFormControlInput<TValue, TControls>,
    getControl,
  ) as SignalFormControlLike<TValue>;
}

/**
 * Type guard to check if an object is a SignalForm (form group).
 * 
 * @template TData - Object type defining the form structure
 * @param obj - Object to check
 * @returns True if obj is a SignalForm
 * 
 * @example
 * ```typescript
 * if (isSignalFormGroup(value)) {
 *   console.log(value.controls.name); // TypeScript knows this is a form group
 * }
 * ```
 */
export function isSignalFormGroup<TData extends object>(
  obj: unknown,
): obj is SignalForm<TData> {
  return (
    !!obj &&
    typeof obj === 'object' &&
    (obj as SignalForm<TData>).kind === 'group'
  );
}

/**
 * Creates a reactive form group for managing structured form data.
 * 
 * Builds a typed form container that holds multiple named controls, groups, or arrays.
 * Each property in the input object becomes a control with full signal-based reactivity.
 * Provides type-safe access to controls and tracks collective validation state.
 * 
 * Features:
 * - Type-safe control access via `.controls` property
 * - Reactive value and error tracking across all controls
 * - Collective state management (touched, dirty, valid)
 * - Manual error/warning management at group level
 * - Support for nested groups and arrays
 * - Cross-field validation via getControl accessor
 * 
 * @template TData - Object type defining the structure and types of all controls
 * 
 * @param inputs - Object mapping property names to their control inputs
 * @returns Fully configured SignalForm instance
 * 
 * @example
 * ```typescript
 * // Simple form
 * const form = createSignalFormGroup({
 *   name: 'John',
 *   age: 25
 * });
 * 
 * // With validators and nested structure
 * const form = createSignalFormGroup<User>({
 *   email: {
 *     value: '',
 *     validators: [signalFormValidators.required, signalFormValidators.email]
 *   },
 *   age: {
 *     value: 25,
 *     validators: [signalFormValidators.min(0)],
 *     warnings: [signalFormValidators.max(120)]
 *   },
 *   address: {
 *     street: '123 Main St',
 *     city: 'NYC'
 *   },
 *   hobbies: ['coding', 'gaming']
 * });
 * 
 * // Access controls
 * form.controls.email.value(); // Type-safe access
 * form.getControl('age').setValue(30);
 * ```
 */
export function createSignalFormGroup<TData extends object>(
  inputs: SignalFormInputs<TData>,
): SignalForm<TData> {
  // type _Controls = { [Key in keyof TData]: SignalFormControlLike<TData[Key]> };
  type _ControlsValues = SignalFormControlLike<TData[keyof TData]>;

  const controls = {} as {
    [Key in keyof TData]: SignalFormControlLike<TData[Key]>;
  };

  const getControl: ControlAccessor<TData> = key => controls[key];

  Object.entries(inputs).forEach(([key, value]) => {
    controls[key as keyof TData] = createNodeFromInput(
      value as SignalFormInput<TData[keyof TData], TData>,
      getControl,
    );
  });

  const selfDirty = signal(false);
  const selfTouched = signal(false);
  const selfDisabled = signal(false);
  const manualErrors = signal<Record<string, string>>({});
  const manualWarnings = signal<Record<string, string>>({});

  const value = computed(() => {
    return (
      Object.entries(controls) as [
        string,
        SignalFormControlLike<TData[keyof TData]>,
      ][]
    ).reduce(
      (acc, [key, control]) => {
        acc[key as keyof TData] = control.value() as SignalFormValueFor<
          TData[keyof TData]
        >;
        return acc;
      },
      {} as { [Key in keyof TData]: SignalFormValueFor<TData[Key]> },
    );
  });

  const errors = computed(() => {
    const all = {} as { [Key in keyof TData]: SignalFormErrorFor<TData[Key]> };
    (
      Object.entries(controls) as [
        string,
        SignalFormControlLike<TData[keyof TData]>,
      ][]
    ).forEach(([key, control]) => {
      if (control.kind === 'control') {
        const map = control.errors();
        all[key as keyof TData] = (
          hasErrors(map) ? map : undefined
        ) as SignalFormErrorFor<TData[keyof TData]>;
        return;
      }
      const childErrors = control.errors();
      all[key as keyof TData] = (
        isEmptyErrorTree(childErrors) ? undefined : childErrors
      ) as SignalFormErrorFor<TData[keyof TData]>;
    });
    return all;
  });

  const warnings = computed(() => {
    const all = {} as { [Key in keyof TData]: SignalFormErrorFor<TData[Key]> };
    (
      Object.entries(controls) as [
        string,
        SignalFormControlLike<TData[keyof TData]>,
      ][]
    ).forEach(([key, control]) => {
      if (control.kind === 'control') {
        const map = control.warnings();
        all[key as keyof TData] = (
          hasErrors(map) ? map : undefined
        ) as SignalFormErrorFor<TData[keyof TData]>;
        return;
      }
      const childWarnings = control.warnings();
      all[key as keyof TData] = (
        isEmptyErrorTree(childWarnings) ? undefined : childWarnings
      ) as SignalFormErrorFor<TData[keyof TData]>;
    });
    return all;
  });

  const selfErrors = computed(() => {
    if (selfDisabled()) return {};
    return { ...manualErrors() };
  });

  const selfWarnings = computed(() => {
    if (selfDisabled()) return {};
    return { ...manualWarnings() };
  });

  const invalid = computed(() => {
    if (selfDisabled()) return false;
    return (
      hasErrors(selfErrors()) ||
      (Object.values(controls) as _ControlsValues[]).some(control =>
        control.invalid(),
      )
    );
  });

  const valid = computed(() => !invalid());

  const touched = computed(
    () =>
      selfTouched() ||
      (Object.values(controls) as _ControlsValues[]).some(control =>
        control.touched(),
      ),
  );

  const dirty = computed(
    () =>
      selfDirty() ||
      (Object.values(controls) as _ControlsValues[]).some(control =>
        control.dirty(),
      ),
  );

  const setValue = (
    nextValues: Partial<{
      [Key in keyof TData]: SignalFormValueFor<TData[Key]>;
    }>,
    options?: SignalFormSetValueOptions,
  ): void => {
    Object.entries(nextValues).forEach(([key, nextValue]) => {
      const control = controls[key as keyof TData];
      control?.setValue(nextValue as never, options);
    });
    if (options?.markDirty ?? true) selfDirty.set(true);
    if (options?.markTouched) selfTouched.set(true);
  };

  const reset = (
    nextValues?: Partial<{
      [Key in keyof TData]: SignalFormValueFor<TData[Key]>;
    }>,
  ): void => {
    if (nextValues) {
      setValue(nextValues, { markDirty: false });
    } else {
      (Object.values(controls) as _ControlsValues[]).forEach(control =>
        control.reset(),
      );
    }
    selfDirty.set(false);
    selfTouched.set(false);
    manualErrors.set({});
    manualWarnings.set({});
  };

  const setDisabled = (
    disabled: boolean,
    options?: SignalFormDisableOptions,
  ): void => {
    selfDisabled.set(disabled);
    if (!options?.onlySelf) {
      (Object.values(controls) as _ControlsValues[]).forEach(control =>
        control.setDisabled(disabled),
      );
    }
  };

  return {
    kind: 'group',
    controls,
    value,
    errors,
    warnings,
    selfErrors,
    selfWarnings,
    disabled: computed(() => selfDisabled()),
    touched,
    dirty,
    invalid,
    valid,
    getControl,
    setValue,
    reset,
    markTouched: () => selfTouched.set(true),
    markUntouched: () => selfTouched.set(false),
    markDirty: () => selfDirty.set(true),
    markPristine: () => selfDirty.set(false),
    markAllTouched: () =>
      (Object.values(controls) as _ControlsValues[]).forEach(control =>
        control.markTouched(),
      ),
    setDisabled,
    setError: (key: string, message: string) =>
      manualErrors.update(current => ({ ...current, [key]: message })),
    clearError: (key: string) =>
      manualErrors.update(current => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _removed, ...rest } = current;
        return rest;
      }),
    clearErrors: () => manualErrors.set({}),
    setWarning: (key: string, message: string) =>
      manualWarnings.update(current => ({ ...current, [key]: message })),
    clearWarning: (key: string) =>
      manualWarnings.update(current => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _removed, ...rest } = current;
        return rest;
      }),
    clearWarnings: () => manualWarnings.set({}),
  };
}

/**
 * Helper function to create a standalone form control.
 * 
 * Creates a control without sibling control access. Useful for creating
 * individual controls outside of a form group context.
 * 
 * @template TValue - The type of value the control manages
 * @param input - Control input (raw value, config object, or existing control)
 * @returns SignalFormControl instance
 * 
 * @example
 * ```typescript
 * const nameControl = formControl('John');
 * const ageControl = formControl({
 *   value: 25,
 *   validators: [signalFormValidators.min(0)]
 * });
 * ```
 */
export function formControl<TValue>(
  input: SignalFormControlInput<TValue, object>,
): SignalFormControl<TValue> {
  return createSignalFormControl(input, undefined);
}

/**
 * Helper function to create a standalone form array.
 * 
 * Creates an array without sibling control access. Useful for creating
 * array controls outside of a form group context.
 * 
 * @template TValue - The type of each item in the array
 * @param input - Array of initial items
 * @returns SignalFormArray instance
 * 
 * @example
 * ```typescript
 * const tagsArray = formArray(['tag1', 'tag2', 'tag3']);
 * const addressesArray = formArray<Address>([
 *   { street: '123 Main', city: 'NYC' }
 * ]);
 * ```
 */
export function formArray<TValue>(
  input: SignalFormInput<TValue, object>[],
): SignalFormArray<TValue> {
  return createSignalFormArray(input, undefined);
}

/**
 * Helper function to create a form group.
 * 
 * Alias for createSignalFormGroup. Creates a typed form with multiple controls.
 * 
 * @template TData - Object type defining the form structure
 * @param input - Object mapping property names to control inputs
 * @returns SignalForm instance
 * 
 * @example
 * ```typescript
 * const form = formGroup({
 *   name: 'John',
 *   email: {
 *     value: 'john@example.com',
 *     validators: [signalFormValidators.email]
 *   }
 * });
 * ```
 */
export function formGroup<TData extends object>(
  input: SignalFormInputs<TData>,
): SignalForm<TData> {
  return createSignalFormGroup(input);
}

/**
 * Primary API for creating signal-based reactive forms.
 * 
 * Alias for `formGroup`. This is the main entry point for creating forms.
 * Provides type-safe, signal-based form state management with built-in validation.
 * 
 * @example
 * ```typescript
 * // Basic form
 * const form = signalForm({ name: 'John', age: 25 });
 * 
 * // Complex form with validation
 * const form = signalForm<Person>({
 *   name: {
 *     value: '',
 *     validators: [signalFormValidators.required, signalFormValidators.minLength(2)]
 *   },
 *   age: {
 *     value: 30,
 *     validators: [signalFormValidators.min(0)],
 *     warnings: [signalFormValidators.max(120)],
 *     disabled: (ctx) => ctx.getControl('name').value() === 'admin'
 *   },
 *   address: {
 *     street: '123 Main St',
 *     city: 'NYC'
 *   },
 *   hobbies: ['coding', 'gaming']
 * });
 * 
 * // Access form state
 * console.log(form.value()); // { name: '', age: 30, address: {...}, hobbies: [...] }
 * console.log(form.valid()); // boolean
 * console.log(form.controls.name.errors()); // { required: 'This field is required' }
 * ```
 */
export const signalForm = formGroup;
