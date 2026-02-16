import { Signal, WritableSignal } from '@angular/core';
import { SignalOrValue } from '../utils/signals.utils';

/**
 * Recursively extracts the value type from a form structure.
 * 
 * Converts form control types to their underlying value types:
 * - Arrays become arrays of extracted values
 * - Objects become objects with extracted property values
 * - Primitives become `T | undefined`
 * 
 * @template T - The form structure type to extract values from
 * 
 * @example
 * ```typescript
 * type Person = { name: string; age: number };
 * type PersonValue = SignalFormValueFor<Person>;
 * // Result: { name: string | undefined; age: number | undefined }
 * ```
 */
export type SignalFormValueFor<T> = T extends (infer U)[]
  ? SignalFormValueFor<U>[]
  : T extends object
    ? { [Key in keyof T]: SignalFormValueFor<T[Key]> }
    : T | undefined;

/**
 * Recursively defines the error structure for a form.
 * 
 * Mirrors the form structure where:
 * - Arrays become arrays of error structures
 * - Objects become objects with error properties
 * - Primitives become error maps (Record<string, string>) or undefined
 * 
 * @template T - The form structure type to create error structure for
 * 
 * @example
 * ```typescript
 * type Person = { name: string; hobbies: string[] };
 * type PersonErrors = SignalFormErrorFor<Person>;
 * // Result: { name: Record<string, string> | undefined; hobbies: (Record<string, string> | undefined)[] }
 * ```
 */
export type SignalFormErrorFor<T> = T extends (infer U)[]
  ? SignalFormErrorFor<U>[]
  : T extends object
    ? { [Key in keyof T]: SignalFormErrorFor<T[Key]> }
    : Record<string, string> | undefined;

/**
 * Represents the first error or warning found in a control.
 * 
 * @template Type - Either 'error' or 'warning' to distinguish validation type
 * 
 * @property name - The validator name that triggered this error/warning
 * @property message - The human-readable error/warning message
 * @property type - Whether this is an 'error' or 'warning'
 * 
 * @example
 * ```typescript
 * const firstError: FirstError<'error'> = {
 *   name: 'required',
 *   message: 'This field is required',
 *   type: 'error'
 * };
 * ```
 */
export type FirstError<Type extends 'warning' | 'error'> =
  | { name: string; message: string; type: Type }
  | undefined;

/**
 * Represents a single form control (primitive value) with validation and state management.
 * 
 * A control wraps a primitive value (string, number, etc.) and provides:
 * - Reactive value through Angular signals
 * - Validation with errors and warnings
 * - State tracking (touched, dirty, disabled)
 * - Manual error/warning management
 * 
 * @template TValue - The type of value this control manages
 */
export interface SignalFormControl<TValue> {
  /** Discriminator property set to 'control' for type checking */
  kind: 'control';
  /** Writable signal containing the current control value */
  value: WritableSignal<TValue | undefined>;
  /** Signal indicating if the control is disabled */
  disabled: Signal<boolean>;
  /** Signal indicating if the control has been interacted with */
  touched: Signal<boolean>;
  /** Signal indicating if the value has changed from initial */
  dirty: Signal<boolean>;
  /** Signal containing all validation errors (from validators + manual) */
  errors: Signal<Record<string, string>>;
  /** Signal containing all validation warnings (from warnings + manual) */
  warnings: Signal<Record<string, string>>;
  /** Signal containing only manually set errors */
  selfErrors: Signal<Record<string, string>>;
  /** Signal containing only manually set warnings */
  selfWarnings: Signal<Record<string, string>>;
  /** Signal true when control has errors and is not disabled */
  invalid: Signal<boolean>;
  /** Signal true when control has no errors */
  valid: Signal<boolean>;
  /** Signal with the first error, if any */
  firstError: Signal<FirstError<'error'>>;
  /** Signal with the first warning, if any */
  firstWarning: Signal<FirstError<'warning'>>;
  /** Signal with the first error or warning */
  firstErrorOrWarning: Signal<FirstError<'error' | 'warning'>>;
  /**
   * Updates the control value with optional state flags.
   * @param value - New value to set
   * @param options - Optional flags for marking dirty/touched
   */
  setValue: (
    value: TValue | undefined,
    options?: SignalFormSetValueOptions,
  ) => void;
  /**
   * Resets control to initial value and clears all state.
   * @param value - Optional new initial value
   */
  reset: (value?: TValue | undefined) => void;
  /** Marks the control as touched */
  markTouched: () => void;
  /** Marks the control as not touched */
  markUntouched: () => void;
  /** Marks the control as dirty (modified) */
  markDirty: () => void;
  /** Marks the control as pristine (unmodified) */
  markPristine: () => void;
  /**
   * Sets the disabled state of the control.
   * @param disabled - True to disable, false to enable
   */
  setDisabled: (disabled: boolean) => void;
  /**
   * Adds a manual error with key and message.
   * @param key - Error identifier key
   * @param message - Error message
   */
  setError: (key: string, message: string) => void;
  /**
   * Removes a specific manual error by key.
   * @param key - Error identifier key to remove
   */
  clearError: (key: string) => void;
  /** Removes all manual errors */
  clearErrors: () => void;
  /**
   * Adds a manual warning with key and message.
   * @param key - Warning identifier key
   * @param message - Warning message
   */
  setWarning: (key: string, message: string) => void;
  /**
   * Removes a specific manual warning by key.
   * @param key - Warning identifier key to remove
   */
  clearWarning: (key: string) => void;
  /** Removes all manual warnings */
  clearWarnings: () => void;
}

/**
 * Represents a form array - a collection of form controls/groups with dynamic add/remove capabilities.
 * 
 * Manages an array of controls where each item can be a control, group, or nested array.
 * Provides methods for array manipulation (push, insert, remove) and tracks collective state.
 * 
 * @template TValue - The type of each item in the array
 */
export interface SignalFormArray<TValue> {
  /** Discriminator property set to 'array' for type checking */
  kind: 'array';
  /** Signal containing the array of child controls */
  controls: Signal<SignalFormControlLike<TValue>[]>;
  /** Signal containing array of extracted values from all controls */
  value: Signal<SignalFormValueFor<TValue>[]>;
  /** Signal containing array of error structures from all controls */
  errors: Signal<SignalFormErrorFor<TValue>[]>;
  /** Signal containing array of warning structures from all controls */
  warnings: Signal<SignalFormErrorFor<TValue>[]>;
  /** Signal containing manually set errors on the array itself */
  selfErrors: Signal<Record<string, string>>;
  /** Signal containing manually set warnings on the array itself */
  selfWarnings: Signal<Record<string, string>>;
  /** Signal indicating if the array is disabled */
  disabled: Signal<boolean>;
  /** Signal true when array or any child is touched */
  touched: Signal<boolean>;
  /** Signal true when array or any child is dirty */
  dirty: Signal<boolean>;
  /** Signal true when array or any child has errors */
  invalid: Signal<boolean>;
  /** Signal true when array and all children have no errors */
  valid: Signal<boolean>;
  /**
   * Inserts a control at specified index (defaults to end).
   * @param item - Item to insert (value, config, or control)
   * @param index - Position to insert at (optional, defaults to end)
   * @returns Index where item was inserted
   */
  insert: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item: SignalFormInput<TValue, any> | SignalFormValueFor<TValue>,
    index?: number,
  ) => number;
  /**
   * Appends a control to the end of the array.
   * @param item - Item to append (value, config, or control)
   * @returns Index where item was inserted
   */
  push: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    item: SignalFormInput<TValue, any> | SignalFormValueFor<TValue>,
  ) => number;
  /**
   * Removes the control at specified index.
   * @param index - Index of control to remove
   */
  removeAt: (index: number) => void;
  /** Removes all controls from the array */
  clear: () => void;
  /**
   * Retrieves the control at specified index.
   * @param index - Index of control to retrieve
   * @returns Control at index, or undefined if out of bounds
   */
  at: (index: number) => SignalFormControlLike<TValue> | undefined;
  /**
   * Sets values for all controls (recreates if length differs).
   * @param value - Array of new values
   * @param options - Optional flags for marking dirty/touched
   */
  setValue: (
    value: SignalFormValueFor<TValue>[],
    options?: SignalFormSetValueOptions,
  ) => void;
  /**
   * Resets all controls to initial state or provided values.
   * @param value - Optional new initial values
   */
  reset: (value?: SignalFormValueFor<TValue>[]) => void;
  /** Marks the array itself as touched */
  markTouched: () => void;
  /** Marks the array itself as untouched */
  markUntouched: () => void;
  /** Marks the array itself as dirty */
  markDirty: () => void;
  /** Marks the array itself as pristine */
  markPristine: () => void;
  /** Marks the array and all children as touched */
  markAllTouched: () => void;
  /**
   * Sets disabled state for array and optionally children.
   * @param disabled - True to disable, false to enable
   * @param options - Options to control if children are affected
   */
  setDisabled: (disabled: boolean, options?: SignalFormDisableOptions) => void;
  /**
   * Adds a manual error to the array.
   * @param key - Error identifier key
   * @param message - Error message
   */
  setError: (key: string, message: string) => void;
  /**
   * Removes a specific manual error.
   * @param key - Error identifier key to remove
   */
  clearError: (key: string) => void;
  /** Removes all manual errors */
  clearErrors: () => void;
  /**
   * Adds a manual warning to the array.
   * @param key - Warning identifier key
   * @param message - Warning message
   */
  setWarning: (key: string, message: string) => void;
  /**
   * Removes a specific manual warning.
   * @param key - Warning identifier key to remove
   */
  clearWarning: (key: string) => void;
  /** Removes all manual warnings */
  clearWarnings: () => void;
}

/**
 * Represents a form group - a structured collection of named form controls.
 * 
 * Manages an object/record of controls where each property is a control, group, or array.
 * Provides type-safe access to controls and tracks collective validation state.
 * 
 * @template TData - The object type defining the structure and types of all controls
 */
export interface SignalForm<TData extends object> {
  /** Discriminator property set to 'group' for type checking */
  kind: 'group';
  /** Object containing all named child controls */
  controls: { [Key in keyof TData]: SignalFormControlLike<TData[Key]> };
  /** Signal containing object with extracted values from all controls */
  value: Signal<{ [Key in keyof TData]: SignalFormValueFor<TData[Key]> }>;
  /** Signal containing object with error structures from all controls */
  errors: Signal<{ [Key in keyof TData]: SignalFormErrorFor<TData[Key]> }>;
  /** Signal containing object with warning structures from all controls */
  warnings: Signal<{ [Key in keyof TData]: SignalFormErrorFor<TData[Key]> }>;
  /** Signal containing manually set errors on the group itself */
  selfErrors: Signal<Record<string, string>>;
  /** Signal containing manually set warnings on the group itself */
  selfWarnings: Signal<Record<string, string>>;
  /** Signal indicating if the group is disabled */
  disabled: Signal<boolean>;
  /** Signal true when group or any child is touched */
  touched: Signal<boolean>;
  /** Signal true when group or any child is dirty */
  dirty: Signal<boolean>;
  /** Signal true when group or any child has errors */
  invalid: Signal<boolean>;
  /** Signal true when group and all children have no errors */
  valid: Signal<boolean>;
  /**
   * Type-safe method to retrieve a specific control by key.
   * @param key - Control property name
   * @returns The control for the specified key
   */
  getControl: <Key extends keyof TData>(
    key: Key,
  ) => SignalFormControlLike<TData[Key]>;
  /**
   * Updates values for specified controls (partial updates supported).
   * @param value - Partial object with new values
   * @param options - Optional flags for marking dirty/touched
   */
  setValue: (
    value: Partial<{ [Key in keyof TData]: SignalFormValueFor<TData[Key]> }>,
    options?: SignalFormSetValueOptions,
  ) => void;
  /**
   * Resets all controls to initial state or provided values.
   * @param value - Optional partial object with new initial values
   */
  reset: (
    value?: Partial<{ [Key in keyof TData]: SignalFormValueFor<TData[Key]> }>,
  ) => void;
  /** Marks the group itself as touched */
  markTouched: () => void;
  /** Marks the group itself as untouched */
  markUntouched: () => void;
  /** Marks the group itself as dirty */
  markDirty: () => void;
  /** Marks the group itself as pristine */
  markPristine: () => void;
  /** Marks the group and all children as touched */
  markAllTouched: () => void;
  /**
   * Sets disabled state for group and optionally children.
   * @param disabled - True to disable, false to enable
   * @param options - Options to control if children are affected
   */
  setDisabled: (disabled: boolean, options?: SignalFormDisableOptions) => void;
  /**
   * Adds a manual error to the group.
   * @param key - Error identifier key
   * @param message - Error message
   */
  setError: (key: string, message: string) => void;
  /**
   * Removes a specific manual error.
   * @param key - Error identifier key to remove
   */
  clearError: (key: string) => void;
  /** Removes all manual errors */
  clearErrors: () => void;
  /**
   * Adds a manual warning to the group.
   * @param key - Warning identifier key
   * @param message - Warning message
   */
  setWarning: (key: string, message: string) => void;
  /**
   * Removes a specific manual warning.
   * @param key - Warning identifier key to remove
   */
  clearWarning: (key: string) => void;
  /** Removes all manual warnings */
  clearWarnings: () => void;
}

/**
 * Type utility that maps a value type to its appropriate control interface.
 * 
 * Automatically determines the correct control type based on the value:
 * - Arrays → SignalFormArray
 * - Objects → SignalForm (group)
 * - Primitives → SignalFormControl
 * 
 * @template TValue - The value type to map to a control interface
 * 
 * @example
 * ```typescript
 * type StringControl = SignalFormControlLike<string>; // SignalFormControl<string>
 * type PersonControl = SignalFormControlLike<Person>; // SignalForm<Person>
 * type HobbiesControl = SignalFormControlLike<string[]>; // SignalFormArray<string>
 * ```
 */
export type SignalFormControlLike<TValue> = TValue extends (infer U)[]
  ? SignalFormArray<U>
  : TValue extends object
    ? SignalForm<TValue>
    : SignalFormControl<TValue>;

/**
 * Context object passed to validators and disabled functions.
 * 
 * Provides access to the current control's value and sibling controls,
 * enabling cross-field validation and dynamic behavior based on other form values.
 * 
 * @template TControls - Object type defining all available sibling controls
 * @template TValue - The type of the current control's value
 * 
 * @example
 * ```typescript
 * const validator: SignalFormValidatorFn<FormModel, string> = (ctx) => {
 *   const otherControl = ctx.getControl('otherField');
 *   return ctx.item.value === otherControl.value() ? null : { mismatch: 'Values must match' };
 * };
 * ```
 */
export interface SignalFormContext<TControls extends object, TValue> {
  /** Object containing the current control's value */
  item: {
    value: TValue | undefined;
  };
  /**
   * Function to retrieve sibling controls by key for cross-field logic.
   * @param controlName - Key of the sibling control to retrieve
   * @returns The sibling control
   */
  getControl: <ControlKey extends keyof TControls>(
    controlName: ControlKey,
  ) => SignalFormControlLike<TControls[ControlKey]>;
}

/**
 * Return type for validation functions.
 * 
 * Validators return a map of error keys to messages when validation fails,
 * or null/empty when validation passes. Empty strings and null values are ignored.
 * 
 * @example
 * ```typescript
 * const result: SignalFormValidationError = { required: 'Field is required', min: 'Too small' };
 * const success: SignalFormValidationError = null;
 * ```
 */
export type SignalFormValidationError = Record<
  string,
  string | undefined | null
> | null;

/**
 * Function signature for validators and warnings.
 * 
 * Takes a context with the current value and sibling controls,
 * returns error/warning messages or null when validation passes.
 * 
 * @template TControls - Object type defining available sibling controls
 * @template TValue - The type of value being validated
 * 
 * @param ctx - Validation context with current value and control accessor
 * @returns Error map when validation fails, null when it passes
 * 
 * @example
 * ```typescript
 * const minValidator: SignalFormValidatorFn<any, number> = ({ item }) => {
 *   return item.value && item.value < 0 ? { min: 'Must be positive' } : null;
 * };
 * ```
 */
export type SignalFormValidatorFn<TControls extends object, TValue> = (
  ctx: SignalFormContext<TControls, TValue>,
) => SignalFormValidationError;

/**
 * Configuration object for creating a form control with advanced options.
 * 
 * Allows specifying initial value, validators, warnings, and dynamic disabled logic.
 * 
 * @template TValue - The type of value the control will manage
 * @template TControls - Object type defining available sibling controls for validators
 * 
 * @example
 * ```typescript
 * const config: SignalFormControlConfig<number, FormModel> = {
 *   value: 0,
 *   validators: [signalFormValidators.min(0)],
 *   warnings: [signalFormValidators.max(100)],
 *   disabled: (ctx) => ctx.getControl('otherField').value() === 'locked'
 * };
 * ```
 */
export interface SignalFormControlConfig<TValue, TControls extends object> {
  /** Initial value (can be a signal or static value) */
  value: SignalOrValue<TValue | undefined>;
  /** Disabled state (boolean, signal, or function based on form context) */
  disabled?: SignalOrValue<boolean> | SignalFormDisabledFn<TControls, TValue>;
  /** Array of validation functions that mark control as invalid */
  validators?: SignalFormValidatorFn<TControls, TValue>[];
  /** Array of validation functions that don't affect validity */
  warnings?: SignalFormValidatorFn<TControls, TValue>[];
}

/**
 * Input type accepted when creating a form control.
 * 
 * Flexible input that accepts:
 * - A raw value (primitive, signal)
 * - A configuration object with validators and options
 * - An existing SignalFormControl instance
 * 
 * @template TValue - The value type for the control
 * @template TControls - Object type defining available sibling controls
 */
export type SignalFormControlInput<TValue, TControls extends object> =
  | SignalOrValue<TValue | undefined>
  | SignalFormControlConfig<TValue, TControls>
  | SignalFormControl<TValue>;

/**
 * Input type accepted when creating a form group.
 * 
 * @template TData - Object type defining the structure of the group
 */
export type SignalFormGroupInput<TData extends object> =
  | SignalFormInputs<TData>
  | SignalForm<TData>;

/**
 * Input type accepted when creating a form array.
 * 
 * @template TItem - The type of each item in the array
 * @template TControls - Object type defining available sibling controls
 */
export type SignalFormArrayInput<TItem, TControls extends object> =
  | SignalFormArray<TItem>
  | SignalFormInput<TItem, TControls>[];

/**
 * Recursive input type that automatically maps to the correct control input type.
 * 
 * Determines the appropriate input type based on value structure:
 * - Arrays → SignalFormArrayInput
 * - Objects → SignalFormGroupInput
 * - Primitives → SignalFormControlInput
 * 
 * @template TValue - The value type to create an input for
 * @template TControls - Object type defining available sibling controls
 */
export type SignalFormInput<
  TValue,
  TControls extends object,
> = TValue extends (infer U)[]
  ? SignalFormArrayInput<U, TControls>
  : TValue extends object
    ? SignalFormGroupInput<TValue>
    : SignalFormControlInput<TValue, TControls>;

/**
 * Type for defining the inputs of a form group.
 * 
 * Maps each property of TData to its appropriate input type,
 * all properties are optional to allow partial form definitions.
 * 
 * @template TData - Object type defining the structure of the form
 */
export type SignalFormInputs<TData extends object> = {
  [Key in keyof TData]?: SignalFormInput<TData[Key], TData>;
};

/**
 * Function signature for dynamic disabled logic.
 * 
 * Determines if a control should be disabled based on form context.
 * 
 * @template TControls - Object type defining available sibling controls
 * @template TValue - The type of value in the control
 * 
 * @param ctx - Context with current value and sibling controls
 * @returns Boolean indicating if control should be disabled
 */
export type SignalFormDisabledFn<TControls extends object, TValue> = (
  ctx: SignalFormContext<TControls, TValue>,
) => boolean;

/**
 * Options for setValue operations.
 */
export interface SignalFormSetValueOptions {
  /** Whether to mark the control as dirty (default: true) */
  markDirty?: boolean;
  /** Whether to mark the control as touched (default: false) */
  markTouched?: boolean;
}

/**
 * Options for setDisabled operations.
 */
export interface SignalFormDisableOptions {
  /** If true, only disable this control without affecting children (default: false) */
  onlySelf?: boolean;
}
