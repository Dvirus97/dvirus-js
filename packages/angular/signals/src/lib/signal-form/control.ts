import { computed, isSignal, linkedSignal, signal } from '@angular/core';
import {
  fromSignalObj,
  SignalOrValue,
  signalOrValue,
  SignalOrValueObj,
} from '../utils/signals.utils';
import { collectValidationErrors, hasErrors } from './errors';

import {
  FirstError,
  SignalFormControl,
  SignalFormControlConfig,
  SignalFormControlInput,
  SignalFormControlLike,
  SignalFormContext,
  SignalFormDisabledFn,
  SignalFormSetValueOptions,
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
 * Shared empty error map object to avoid creating new objects.
 *
 * @internal
 */
const EMPTY_ERROR_MAP: Record<string, string> = {};

/**
 * Checks if a value is a plain JavaScript object (not array, not null, not class instance).
 *
 * @internal
 * @param value - Value to check
 * @returns True if value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Checks if an object contains any Angular signal values.
 *
 * @internal
 * @param obj - Object to check for signal values
 * @returns True if any property value is a signal
 */
function hasSignalValues(obj: Record<string, unknown>): boolean {
  return Object.values(obj).some((value) => isSignal(value));
}

/**
 * Resolves a SignalOrValue to its actual value, handling nested signal objects.
 *
 * If the resolved value is a plain object containing signals, it converts
 * all signal properties to their values using fromSignalObj.
 *
 * @internal
 * @template TValue - The type of value to resolve
 * @param value - Signal or static value to resolve
 * @returns The resolved value
 */
function resolveControlValue<TValue>(
  value: SignalOrValue<TValue | undefined>,
): TValue | undefined {
  const resolved = signalOrValue(value);
  if (isPlainObject(resolved) && hasSignalValues(resolved)) {
    return fromSignalObj(resolved as SignalOrValueObj) as TValue;
  }
  return resolved;
}

/**
 * Normalizes various control input formats to a standard SignalFormControlConfig.
 *
 * Handles three input types:
 * - SignalFormControl: extracts current value
 * - Config object with 'value' property: uses as-is
 * - Raw value: wraps in config object
 *
 * @internal
 * @template TValue - The type of control value
 * @template TControls - Object type defining available sibling controls
 * @param input - Input in any accepted format
 * @returns Normalized control configuration
 */
function normalizeControlInput<TValue, TControls extends object>(
  input: SignalFormControlInput<TValue, TControls>,
): SignalFormControlConfig<TValue, TControls> {
  if (isSignalFormControl(input)) {
    return { value: input.value() } as SignalFormControlConfig<
      TValue,
      TControls
    >;
  }
  if (typeof input === 'object' && input !== null && 'value' in input) {
    return input as SignalFormControlConfig<TValue, TControls>;
  }
  return { value: input as SignalOrValue<TValue | undefined> };
}

/**
 * Type guard to check if an object is a SignalFormControl.
 *
 * @template TValue - The type of value the control manages
 * @param obj - Object to check
 * @returns True if obj is a SignalFormControl
 *
 * @example
 * ```typescript
 * if (isSignalFormControl(value)) {
 *   console.log(value.value()); // TypeScript knows this is a control
 * }
 * ```
 */
export function isSignalFormControl<TValue>(
  obj: unknown,
): obj is SignalFormControl<TValue> {
  return (
    !!obj &&
    typeof obj === 'object' &&
    (obj as SignalFormControl<TValue>).kind === 'control'
  );
}

/**
 * Creates a reactive form control with signal-based state management.
 *
 * Builds a control that wraps a primitive value (string, number, boolean, etc.)
 * with validation, state tracking, and reactive updates using Angular signals.
 *
 * Features:
 * - Reactive value updates through signals
 * - Validators for errors (mark control as invalid)
 * - Warnings (validation messages without invalidating)
 * - Dynamic disabled state based on form context
 * - State tracking (touched, dirty)
 * - Manual error/warning management
 *
 * @template TControls - Object type defining available sibling controls for cross-field validation
 * @template TValue - The type of value this control manages
 *
 * @param input - Control input (raw value, config object, or existing control)
 * @param getControl - Optional accessor function for sibling controls
 * @returns Fully configured SignalFormControl instance
 *
 * @example
 * ```typescript
 * // Simple control
 * const nameControl = createSignalFormControl('John');
 *
 * // With validators
 * const ageControl = createSignalFormControl({
 *   value: 25,
 *   validators: [signalFormValidators.required, signalFormValidators.min(0)],
 *   warnings: [signalFormValidators.max(120)]
 * });
 *
 * // With dynamic disabled
 * const emailControl = createSignalFormControl({
 *   value: '',
 *   disabled: (ctx) => ctx.getControl('accountType').value() === 'guest'
 * });
 * ```
 */
export function createSignalFormControl<TControls extends object, TValue>(
  input: SignalFormControlInput<TValue, TControls>,
  getControl?: ControlAccessor<TControls>,
): SignalFormControl<TValue> {
  if (isSignalFormControl(input)) {
    return input as SignalFormControl<TValue>;
  }

  const config = normalizeControlInput(input);
  const accessControl =
    getControl ??
    ((() => {
      throw new Error('getControl is not available for this control.');
    }) as ControlAccessor<TControls>);

  const initialValue = resolveControlValue(config.value);
  const value = linkedSignal(() => resolveControlValue(config.value));
  const manualErrors = signal<Record<string, string>>({});
  const manualWarnings = signal<Record<string, string>>({});
  const selfTouched = linkedSignal(() => false);
  const selfDirty = linkedSignal(() => false);
  const selfDisabled = signal(false);

  const disabledResolver = config.disabled;
  const disabled = computed(() => {
    const derived =
      typeof disabledResolver === 'function'
        ? (disabledResolver as SignalFormDisabledFn<TControls, TValue>)({
            item: { value: value() },
            getControl: accessControl,
          })
        : disabledResolver
          ? signalOrValue(disabledResolver)
          : false;
    return selfDisabled() || derived;
  });

  const errors = computed(() => {
    if (disabled()) return EMPTY_ERROR_MAP;
    const ctx: SignalFormContext<TControls, TValue> = {
      item: { value: value() },
      getControl: accessControl,
    };
    return {
      ...collectValidationErrors(config.validators, ctx),
      ...manualErrors(),
    };
  });

  const warnings = computed(() => {
    if (disabled()) return EMPTY_ERROR_MAP;
    const ctx: SignalFormContext<TControls, TValue> = {
      item: { value: value() },
      getControl: accessControl,
    };
    return {
      ...collectValidationErrors(config.warnings, ctx),
      ...manualWarnings(),
    };
  });

  const invalid = computed(() => !disabled() && hasErrors(errors()));
  const valid = computed(() => !invalid());

  const firstError = computed<FirstError<'error'>>(() => {
    const entries = Object.entries(errors());
    if (!entries.length) return undefined;
    const [name, message] = entries[0];
    return { name, message, type: 'error' };
  });

  const firstWarning = computed<FirstError<'warning'>>(() => {
    const entries = Object.entries(warnings());
    if (!entries.length) return undefined;
    const [name, message] = entries[0];
    return { name, message, type: 'warning' };
  });

  const firstErrorOrWarning = computed<FirstError<'error' | 'warning'>>(() => {
    return firstError() ?? firstWarning();
  });

  const setValue = (
    next: TValue | undefined,
    options?: SignalFormSetValueOptions,
  ): void => {
    value.set(next);
    if (options?.markDirty ?? true) selfDirty.set(true);
    if (options?.markTouched) selfTouched.set(true);
  };

  const reset = (next?: TValue | undefined): void => {
    value.set(next ?? initialValue);
    selfDirty.set(false);
    selfTouched.set(false);
    manualErrors.set({});
    manualWarnings.set({});
  };

  return {
    kind: 'control',
    value,
    disabled,
    touched: computed(() => selfTouched()),
    dirty: computed(() => selfDirty()),
    errors,
    warnings,
    selfErrors: errors,
    selfWarnings: warnings,
    invalid,
    valid,
    firstError,
    firstWarning,
    firstErrorOrWarning,
    setValue,
    reset,
    markTouched: () => selfTouched.set(true),
    markUntouched: () => selfTouched.set(false),
    markDirty: () => selfDirty.set(true),
    markPristine: () => selfDirty.set(false),
    setDisabled: (next: boolean) => selfDisabled.set(next),
    setError: (key: string, message: string) =>
      manualErrors.update((current) => ({ ...current, [key]: message })),
    clearError: (key: string) =>
      manualErrors.update((current) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _removed, ...rest } = current;
        return rest;
      }),
    clearErrors: () => manualErrors.set({}),
    setWarning: (key: string, message: string) =>
      manualWarnings.update((current) => ({ ...current, [key]: message })),
    clearWarning: (key: string) =>
      manualWarnings.update((current) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [key]: _removed, ...rest } = current;
        return rest;
      }),
    clearWarnings: () => manualWarnings.set({}),
  };
}
