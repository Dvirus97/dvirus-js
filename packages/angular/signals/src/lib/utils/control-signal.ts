import {
  computed,
  DestroyRef,
  inject,
  linkedSignal,
  Signal,
  signal,
  untracked,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  AbstractControl,
  FormControlStatus,
  ValidationErrors,
  FormArray,
} from '@angular/forms';
import { Observable, startWith, Subscription } from 'rxjs';
import { tryCatch } from './try-catch';

interface ControlEvent<T> {
  /**
   * Form control from which this event is originated.
   *
   * Note: the type of the control can't be inferred from T as the event can be emitted by any of child controls
   */
  readonly source: AbstractControl<unknown | T>;
}

// ########## CONTROL SIGNAL ##########

/**
 * A reactive signal-based wrapper around an `AbstractControl`, exposing
 * the control's state (value, status, touched, dirty, errors, etc.) as
 * Angular signals for use in templates and computed expressions.
 *
 * @template T - The value type of the underlying form control.
 * @template TControl - The specific `AbstractControl` type being wrapped (e.g., `FormControl`, `FormGroup`, `FormArray`).
 */
export interface ControlSignal<
  T,
  TControl extends AbstractControl<unknown> = AbstractControl<T>,
> {
  /** Signal returning the underlying `AbstractControl` instance with its specific type. */
  control: TControl;
  /** Signal returning the current value of the control. */
  value: Signal<T | null | undefined>;
  /** Signal returning the current validation status (`VALID`, `INVALID`, `PENDING`, `DISABLED`). */
  status: Signal<FormControlStatus | null | undefined>;
  /** Signal returning the most recent `ControlEvent` emitted by the control. */
  events: Signal<ControlEvent<T> | null | undefined>;
  /** Signal that is `true` when the control status is `DISABLED`. */
  disabled: Signal<boolean>;
  /** Signal that is `true` when the control status is `VALID`. */
  valid: Signal<boolean>;
  /** Signal that is `true` when the control status is `INVALID`. */
  invalid: Signal<boolean>;
  /** Signal that is `true` when the control has been touched. */
  touched: Signal<boolean>;
  /** Signal that is `true` when the control is dirty. */
  dirty: Signal<boolean>;
  /** Signal returning the current validation errors, or `null` if there are none. */
  errors: Signal<ValidationErrors | null>;
  /** Signal returning the key of the first validation error, or `null`. */
  firstErrorKey: Signal<string | null>;
  /** Signal that is `true` when the control is both touched and invalid. */
  touchedAndInvalid: Signal<boolean>;
  /**
   * Signal returning the control's synchronous validators as a `ValidationErrors`-like object, or `null` if there are none.
   * @Note  that this does not include asynchronous validators, and the shape of the returned object may differ from the actual validation errors emitted by the control.
   */
  validators: Signal<ValidationErrors | null>;
  /** Tears down all internal subscriptions and effects. */
  unsubscribe(): void;
}

/**
 * Creates a {@link ControlSignal} that mirrors an `AbstractControl`'s
 * reactive state as Angular signals.
 *
 * **Important:** If called outside an injection context, you must manually handle
 * un-subscription by either:
 * - Calling the `unsubscribe()` method on the returned {@link ControlSignal}, or
 * - Passing a `DestroyRef` via the `options` parameter for automatic cleanup.
 *
 * If called within an injection context without providing a `DestroyRef`, the
 * subscriptions will be automatically cleaned up on component destruction.
 *
 * @template T - The value type of the form control.
 * @param control - The form control or a signal wrapping one.
 * @param options - Optional configuration object containing:
 *   - `destroyRef`: A `DestroyRef` used for automatic cleanup on destruction.
 *     If not provided, the function will attempt to inject one from the current
 *     injection context. If neither is available, manual un-subscription is required.
 * @returns A {@link ControlSignal} exposing the control's state as signals.
 * @throws If `control` is a signal and no `Injector` is available.
 */
export function controlSignal<
  T,
  TControl extends AbstractControl<unknown> = FormControl<T>,
>(
  control: TControl,
  options?: { destroyRef?: DestroyRef | null },
): ControlSignal<T, TControl> {
  const destroyRef =
    options?.destroyRef ??
    tryCatch(() => inject(DestroyRef, { optional: true }))[0];

  let subscriptions: Subscription[] = [];
  const unsubscribe = (): void => {
    subscriptions.forEach((s) => s.unsubscribe());
    subscriptions = [];
  };
  // cleanUp
  unsubscribe();
  destroyRef?.onDestroy(() => unsubscribe());

  const $value = signal<T | null | undefined>(undefined);
  const $status = signal<FormControlStatus | null | undefined>(undefined);
  const _events = signal<ControlEvent<T> | null>(null);
  const $events = linkedSignal<ControlEvent<T> | null | undefined>(() => {
    $value();
    $status();
    return _events();
  });

  subscriptions.push(
    control.valueChanges
      .pipe(startWith(control.value))
      .subscribe((x) => untracked(() => $value.set(x as T))),

    control.statusChanges
      .pipe(startWith(control.status))
      .subscribe((x) => untracked(() => $status.set(x))),

    // control.events.subscribe((x) => untracked(() => $events.set(x))),
  );
  
  // Subscribe to control.events if available (Angular v18+)
  const ctrl = control as unknown as {events: Observable< ControlEvent<T>>};
  if (ctrl.events && typeof ctrl.events.subscribe === 'function') {
    subscriptions.push(
      ctrl.events.subscribe((x: ControlEvent<T>) =>
        untracked(() => {
          _events.set(x);
        }),
      ),
    );
  }

  const invalid = computed(() => ($status(), control.invalid));
  const touched = computed(() => ($events(), control.touched));
  const errors = computed<ValidationErrors | null>(
    () => ($events(), control.errors),
  );

  return {
    control: control as TControl,
    value: computed(() => {
      $value();
      $events();
      return control.value as T;
    }),
    status: $status.asReadonly(),
    events: $events.asReadonly(),

    invalid: invalid,
    errors: errors,
    touched: touched,

    valid: computed(() => ($status(), control.valid)),
    dirty: computed(() => ($events(), control.dirty)),
    disabled: computed(() => ($status(), control.disabled)),
    touchedAndInvalid: computed(() => touched() && invalid()),
    firstErrorKey: computed<string | null>(
      () => Object.keys(errors() ?? {})[0] ?? null,
    ),
    validators: computed(
      () => ($events(), control.validator?.({} as AbstractControl) ?? null),
    ),
    unsubscribe: (): void => unsubscribe(),
  };
}

// ############ FORM GROUP SIGNAL ############

/**
 * Extends {@link ControlSignal} with a strongly-typed `controls` map,
 * providing a `ControlSignal` for every control in the `FormGroup`.
 *
 * @template T - An object type whose keys correspond to the group's control names
 *   and whose values are the respective control value types.
 */
export interface FormGroupSignal<TControls extends TypedControlMap>
  extends ControlSignal<ControlsValue<TControls>, FormGroup<TControls>> {
  /** The underlying `FormGroup` instance. */
  control: FormGroup<TControls>;
  /** A map of child control names to their individual {@link ControlSignal} instances. */
  controls: {
    [K in keyof TControls]: NestedControlSignal<TControls[K]>;
  };
}

/**
 * Creates a {@link FormGroupSignal} for a `FormGroup`. Child controls are
 * converted recursively, so nested `FormGroup` and `FormArray` structures
 * are supported.
 *
 * @template TControls - A typed map of control names to `AbstractControl` instances.
 * @param formGroup - The `FormGroup` to wrap.
 * @param options - Optional `DestroyRef` and `Injector` forwarded to
 *   each underlying {@link controlSignal} call.
 * @returns A {@link FormGroupSignal} with both group-level and per-control signals.
 */
export function formGroupSignal<TControls extends TypedControlMap>(
  formGroup: FormGroup<TControls>,
  options?: { destroyRef?: DestroyRef | null },
): FormGroupSignal<TControls> {
  const destroyRef =
    options?.destroyRef ??
    tryCatch(() => inject(DestroyRef, { optional: true }))[0];

  const controls = Object.fromEntries(
    Object.entries(formGroup.controls).map(([key, ctrl]) => {
      return [key, nestedControlSignal(ctrl, { destroyRef })];
    }),
  ) as { [K in keyof TControls]: NestedControlSignal<TControls[K]> };

  const groupSignal = controlSignal(formGroup);
  const selfUnsubscribe = groupSignal.unsubscribe.bind(groupSignal);

  return Object.assign(groupSignal, {
    controls,
    unsubscribe: () => {
      selfUnsubscribe();
      Object.values(controls).forEach((c) => c.unsubscribe());
    },
  }) as FormGroupSignal<TControls>;
}

// ############ FORM ARRAY SIGNAL ############

export interface FormArraySignal<TControl extends AbstractControl<unknown>>
  extends ControlSignal<ControlValue<TControl>[], FormArray<TControl>> {
  /** The underlying `FormArray` instance. */
  control: FormArray<TControl>;
  controls: NestedControlSignal<TControl>[];
}

/**
 * Creates a {@link FormArraySignal} for a `FormArray`. Child controls are
 * converted recursively, so arrays of `FormGroup`, arrays of `FormArray`,
 * and arrays of `FormControl` are all supported.
 */
export function formArraySignal<TControl extends AbstractControl<unknown>>(
  formArray: FormArray<TControl>,
  options?: { destroyRef?: DestroyRef | null },
): FormArraySignal<TControl> {
  const destroyRef =
    options?.destroyRef ??
    tryCatch(() => inject(DestroyRef, { optional: true }))[0];

  const controls = formArray.controls.map((ctrl) =>
    nestedControlSignal(ctrl, { destroyRef }),
  ) as NestedControlSignal<TControl>[];

  const arraySignal = controlSignal(formArray);
  const selfUnsubscribe = arraySignal.unsubscribe.bind(arraySignal);

  return Object.assign(arraySignal, {
    controls,
    unsubscribe: () => {
      selfUnsubscribe();
      controls.forEach((c) => c.unsubscribe());
    },
  }) as FormArraySignal<TControl>;
}

// ############ HELPERS ############

type TypedControlMap = Record<string, AbstractControl<unknown>>;

type ControlValue<TControl extends AbstractControl<unknown>> =
  TControl extends AbstractControl<infer TValue> ? TValue : never;

type ControlsValue<TControls extends TypedControlMap> = {
  [K in keyof TControls]: ControlValue<TControls[K]>;
};

export type NestedControlSignal<TControl extends AbstractControl<unknown>> =
  TControl extends FormGroup<infer TControls>
    ? FormGroupSignal<TControls & TypedControlMap>
    : TControl extends FormArray<infer TItemControl>
      ? FormArraySignal<TItemControl & AbstractControl<unknown>>
      : ControlSignal<ControlValue<TControl>, TControl>;

function nestedControlSignal<TControl extends AbstractControl<unknown>>(
  control: TControl,
  options?: { destroyRef?: DestroyRef | null },
): NestedControlSignal<TControl> {
  if (control instanceof FormGroup) {
    return formGroupSignal(
      control as FormGroup<TypedControlMap>,
      options,
    ) as NestedControlSignal<TControl>;
  }

  if (control instanceof FormArray) {
    return formArraySignal(
      control as FormArray<AbstractControl<unknown>>,
      options,
    ) as NestedControlSignal<TControl>;
  }

  return controlSignal(
    control as AbstractControl<ControlValue<TControl>>,
    options,
  ) as NestedControlSignal<TControl>;
}
