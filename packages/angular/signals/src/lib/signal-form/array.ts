import { computed, signal } from '@angular/core';

import { createSignalFormControl, isSignalFormControl } from './control';
import { hasErrors, isEmptyErrorTree } from './errors';
import { createSignalFormGroup, isSignalFormGroup } from './form';
import {
  SignalFormArray,
  SignalFormControlLike,
  SignalFormDisableOptions,
  SignalFormErrorFor,
  SignalFormInput,
  SignalFormInputs,
  SignalFormSetValueOptions,
  SignalFormValueFor,
} from './types';

/**
 * Internal type for accessing sibling controls in a form.
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
function isControlConfig(value: unknown): boolean {
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
 * @template TItem - The type of item to create a control for
 * @template TControls - Object type defining available sibling controls
 * @param input - Input value in any accepted format
 * @param getControl - Accessor for sibling controls
 * @returns Appropriate control type for the input
 */
function createNodeFromInput<TItem, TControls extends object>(
  input: SignalFormInput<TItem, TControls> | SignalFormValueFor<TItem>,
  getControl: ControlAccessor<TControls>,
): SignalFormControlLike<TItem> {
  if (isSignalFormControl<TItem>(input)) {
    return input as SignalFormControlLike<TItem>;
  }
  if (isSignalFormGroup<object>(input)) {
    return input as SignalFormControlLike<TItem>;
  }
  if (isSignalFormArray<TItem>(input)) {
    return input as SignalFormControlLike<TItem>;
  }
  if (Array.isArray(input)) {
    return createSignalFormArray(
      input as SignalFormInput<TItem, TControls>[],
      getControl,
    ) as SignalFormControlLike<TItem>;
  }
  if (typeof input === 'object' && input !== null && !isControlConfig(input)) {
    return createSignalFormGroup(
      input as SignalFormInputs<TItem & object>,
    ) as SignalFormControlLike<TItem>;
  }
  return createSignalFormControl(
    input as SignalFormInput<TItem, TControls>,
    getControl,
  ) as SignalFormControlLike<TItem>;
}

/**
 * Type guard to check if an object is a SignalFormArray.
 * 
 * @template TValue - The type of items in the array
 * @param obj - Object to check
 * @returns True if obj is a SignalFormArray
 * 
 * @example
 * ```typescript
 * if (isSignalFormArray(value)) {
 *   console.log(value.controls().length); // TypeScript knows this is an array
 * }
 * ```
 */
export function isSignalFormArray<TValue>(
  obj: unknown,
): obj is SignalFormArray<TValue> {
  return (
    !!obj &&
    typeof obj === 'object' &&
    (obj as SignalFormArray<TValue>).kind === 'array'
  );
}

/**
 * Creates a reactive form array for managing dynamic collections of controls.
 * 
 * Builds an array container that can hold multiple controls (primitives, groups, or nested arrays)
 * with full signal-based reactivity. Provides methods for dynamic addition/removal of items
 * and tracks collective validation state.
 * 
 * Features:
 * - Dynamic array operations (push, insert, remove, clear)
 * - Reactive value and error tracking across all items
 * - Collective state management (touched, dirty, valid)
 * - Manual error/warning management at array level
 * - Type-safe access to individual controls
 * 
 * @template TItem - The type of each item in the array
 * @template TControls - Object type defining available sibling controls
 * 
 * @param inputItems - Array of initial items (values, configs, or controls)
 * @param getControl - Optional accessor for sibling controls
 * @returns Fully configured SignalFormArray instance
 * 
 * @example
 * ```typescript
 * // Array of primitives
 * const tagsArray = createSignalFormArray(['tag1', 'tag2']);
 * tagsArray.push('tag3');
 * 
 * // Array of objects
 * const addressesArray = createSignalFormArray<Address>([
 *   { street: '123 Main', city: 'NYC' },
 *   { street: '456 Oak', city: 'LA' }
 * ]);
 * 
 * // Array with validators
 * const hobbiesArray = createSignalFormArray([
 *   { value: 'coding', validators: [signalFormValidators.minLength(3)] },
 *   'gaming'
 * ]);
 * ```
 */
export function createSignalFormArray<TItem, TControls extends object = object>(
  inputItems: SignalFormInput<TItem, TControls>[],
  getControl?: ControlAccessor<TControls>,
): SignalFormArray<TItem> {
  const accessControl =
    getControl ??
    (((_key: keyof TControls) => {
      throw new Error('getControl is not available for this array.');
    }) as ControlAccessor<TControls>);

  const controls = signal<SignalFormControlLike<TItem>[]>(
    inputItems.map(item => createNodeFromInput(item, accessControl)),
  );

  const selfDirty = signal(false);
  const selfTouched = signal(false);
  const selfDisabled = signal(false);
  const manualErrors = signal<Record<string, string>>({});
  const manualWarnings = signal<Record<string, string>>({});

  const value = computed<SignalFormValueFor<TItem>[]>(
    () =>
      controls().map(control => control.value()) as SignalFormValueFor<TItem>[],
  );

  const errors = computed<SignalFormErrorFor<TItem>[]>(
    () =>
      controls().map(control => {
        if (control.kind === 'control') {
          const map = control.errors();
          return hasErrors(map) ? map : undefined;
        }
        const childErrors = control.errors();
        return isEmptyErrorTree(childErrors) ? undefined : childErrors;
      }) as SignalFormErrorFor<TItem>[],
  );

  const warnings = computed<SignalFormErrorFor<TItem>[]>(
    () =>
      controls().map(control => {
        if (control.kind === 'control') {
          const map = control.warnings();
          return hasErrors(map) ? map : undefined;
        }
        const childWarnings = control.warnings();
        return isEmptyErrorTree(childWarnings) ? undefined : childWarnings;
      }) as SignalFormErrorFor<TItem>[],
  );

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
      hasErrors(selfErrors()) || controls().some(control => control.invalid())
    );
  });

  const valid = computed(() => !invalid());

  const touched = computed(
    () => selfTouched() || controls().some(control => control.touched()),
  );

  const dirty = computed(
    () => selfDirty() || controls().some(control => control.dirty()),
  );

  const insert = (
    item: SignalFormInput<TItem, TControls> | SignalFormValueFor<TItem>,
    index?: number,
  ): number => {
    const node = createNodeFromInput(item, accessControl);
    const position = index ?? controls().length;
    controls.update(old => {
      const newArray = [...old];
      newArray.splice(position, 0, node)
      return newArray;
    });
    selfDirty.set(true);
    return position;
  };

  const push = (
    item: SignalFormInput<TItem, TControls> | SignalFormValueFor<TItem>,
  ): number => insert(item);

  const removeAt = (index: number): void => {
    controls.update(old => {
      const newArray = [...old];
      newArray.splice(index, 1);
      return newArray;
    });
    selfDirty.set(true);
  };

  const clear = (): void => {
    controls.set([]);
    selfDirty.set(true);
  };

  const at = (index: number): SignalFormControlLike<TItem> | undefined =>
    controls()[index];

  const setValue = (
    nextValues: SignalFormValueFor<TItem>[],
    options?: SignalFormSetValueOptions,
  ): void => {
    controls.update(old => {
      if (nextValues.length !== old.length) {
        return nextValues.map(_value =>
          createNodeFromInput(_value, accessControl),
        );
      }
      old.forEach((control, index) => {
        control.setValue(nextValues[index] as never, options);
      });
      return old;
    });
    if (options?.markDirty ?? true) selfDirty.set(true);
    if (options?.markTouched) selfTouched.set(true);
  };

  const reset = (nextValues?: SignalFormValueFor<TItem>[]): void => {
    if (nextValues) {
      setValue(nextValues, { markDirty: false });
    } else {
      controls().forEach(control => control.reset());
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
      controls().forEach(control => control.setDisabled(disabled));
    }
  };

  return {
    kind: 'array',
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
    insert,
    push,
    removeAt,
    clear,
    at,
    setValue,
    reset,
    markTouched: () => selfTouched.set(true),
    markUntouched: () => selfTouched.set(false),
    markDirty: () => selfDirty.set(true),
    markPristine: () => selfDirty.set(false),
    markAllTouched: () => controls().forEach(control => control.markTouched()),
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
