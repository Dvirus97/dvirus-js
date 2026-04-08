import {
  computed,
  DestroyRef,
  inject,
  Signal,
  signal,
  untracked,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  AbstractControl,
  ControlEvent,
  FormControlStatus,
  FormResetEvent,
  PristineChangeEvent,
  StatusChangeEvent,
  ValidationErrors,
} from '@angular/forms';
import { startWith, Subscription } from 'rxjs';
import { tryCatch } from './try-catch';

/**
 * A reactive signal-based wrapper around an `AbstractControl`, exposing
 * the control's state (value, status, touched, dirty, errors, etc.) as
 * Angular signals for use in templates and computed expressions.
 *
 * @template T - The value type of the underlying form control.
 */
export interface ControlSignal<T> {
  /** Signal returning the underlying `AbstractControl` instance. */
  control: AbstractControl<T>;
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
export function controlSignal<T>(
  control: AbstractControl<T>,
  options?: { destroyRef?: DestroyRef },
): ControlSignal<T> {
  const destroyRef =
    options?.destroyRef ?? tryCatch(() => inject(DestroyRef, { optional: true }))[0];

  let subscriptions: Subscription[] = [];
  const unsubscribe = (): void => {
    subscriptions.forEach((s) => s.unsubscribe());
    subscriptions = [];
  };
  // cleanUp
  unsubscribe();

  const $value = signal<T | null | undefined>(undefined);
  const $status = signal<FormControlStatus | null | undefined>(undefined);
  const $events = signal<ControlEvent<T> | null | undefined>(undefined);

  let isDirty = false;

  subscriptions.push(
    control.valueChanges
      .pipe(startWith(control.value))
      .subscribe((x) => untracked(() => $value.set(x))),

    control.statusChanges
      .pipe(startWith(control.status))
      .subscribe((x) => untracked(() => $status.set(x))),

    control.events.subscribe((x) => untracked(() => $events.set(x))),
  );

  destroyRef?.onDestroy(() => unsubscribe());

  const invalid = computed(() => $status() === 'INVALID');
  const disabled = computed(() => $status() === 'DISABLED');
  const valid = computed(() => $status() === 'VALID');
  const touched = computed(() => ($events(), control.touched));
  const errors = computed<ValidationErrors | null>(() => ($events(), control.errors));
  const firstErrorKey = computed<string | null>(() => Object.keys(errors() ?? {})[0] ?? null);
  const touchedAndInvalid = computed(() => touched() && invalid());
  const dirty = computed(() => {
    const events = $events();
    if (events instanceof StatusChangeEvent) isDirty = true;
    if (events instanceof PristineChangeEvent) isDirty = !events.pristine;
    if (events instanceof FormResetEvent) isDirty = false;
    return isDirty;
  });

  return {
    control: control,
    value: $value.asReadonly(),
    status: $status.asReadonly(),
    events: $events.asReadonly(),
    errors,
    touched,
    invalid,
    touchedAndInvalid,
    disabled,
    valid,
    dirty,
    firstErrorKey,
    unsubscribe: (): void => unsubscribe(),
  };
}

/**
 * Extends {@link ControlSignal} with a strongly-typed `controls` map,
 * providing a `ControlSignal` for every control in the `FormGroup`.
 *
 * @template T - An object type whose keys correspond to the group's control names
 *   and whose values are the respective control value types.
 */
export interface FormGroupSignal<T extends object> extends ControlSignal<T> {
  /** A map of child control names to their individual {@link ControlSignal} instances. */
  controls: {
    [K in keyof T]: ControlSignal<T[K]>;
  };
}

/**
 * Creates a {@link FormGroupSignal} for a `FormGroup` whose controls are
 * all `FormControl` instances. Each child control is wrapped with
 * {@link controlSignal}, and the group itself is also wrapped so its
 * aggregate state is available as signals.
 *
 * @template T - An object type mapping control names to their value types.
 * @param formGroup - The `FormGroup` to wrap.
 * @param options - Optional `DestroyRef` and `Injector` forwarded to
 *   each underlying {@link controlSignal} call.
 * @returns A {@link FormGroupSignal} with both group-level and per-control signals.
 * @throws If any control in the group is not a `FormControl` instance.
 */
export function formGroupSignal<T extends object>(
  formGroup: FormGroup<{ [K in keyof T]: FormControl<T[K]> }>,
  options?: { destroyRef?: DestroyRef },
): FormGroupSignal<T> {
  const destroyRef =
    options?.destroyRef ?? tryCatch(() => inject(DestroyRef, { optional: true }))[0] ?? undefined;

  const controls = Object.fromEntries(
    Object.entries(formGroup.controls).map(([key, ctrl]) => {
      if (!(ctrl instanceof FormControl)) {
        throw new Error(
          `All controls in the FormGroup must be instances of FormControl. Control '${key}' is not.`,
        );
      }
      return [key, controlSignal(ctrl, { destroyRef })];
    }),
  );

  return Object.assign(controlSignal(formGroup as unknown as AbstractControl<T>), {
    controls: controls as { [K in keyof T]: ControlSignal<T[K]> },
  });
}



// export type ControlToSignal<T> = Signal<T> & {
//   unsubscribe(): void;
// };

// // assert injection context readable name (message)
// const controlValueSignal_with_control_that_is_a_signal = (): false => false;
// const controlStatusSignal_with_control_that_is_a_signal = (): false => false;
// const controlEventsSignal_with_control_that_is_a_signal = (): false => false;
// const controlSignal_with_control_that_is_a_signal = (): false => false;

// export function controlValueSignal<T>(
//   control: SignalOrValue<AbstractControl<T>>,
//   options?: {
//     destroyRef?: DestroyRef;
//   },
// ): ControlToSignal<T> {
//   const destroyRef =
//     tryCatch(() => inject(DestroyRef, { optional: true }))[0] ?? options?.destroyRef;

//   if (isSignal(control)) {
//     assertInInjectionContext(controlValueSignal_with_control_that_is_a_signal);
//     const resource = rxResource({
//       params: () => ({ control: control() }),
//       stream: ({ params }) => {
//         const { control } = params;
//         return control.valueChanges.pipe(startWith(control.value), takeUntilDestroyed(destroyRef));
//       },
//     });

//     const _signal = computed(() => {
//       return resource.value();
//     }) as ControlToSignal<T>;

//     _signal.unsubscribe = (): void => {
//       untracked(() => {
//         resource.destroy();
//       });
//     };

//     return _signal;
//   } else {
//     const _signal = signal<T | null | undefined>(undefined);

//     const subscription = control.valueChanges.pipe(startWith(control.value)).subscribe((value) => {
//       _signal.set(value);
//     });

//     (_signal as unknown as ControlToSignal<T>).unsubscribe = (): void =>
//       untracked(() => {
//         subscription.unsubscribe();
//       });

//     destroyRef?.onDestroy(() => {
//       subscription.unsubscribe();
//     });

//     return _signal as unknown as ControlToSignal<T>;
//   }
// }

// export function controlStatusSignal<T>(
//   control: SignalOrValue<AbstractControl<T>>,
//   options?: {
//     destroyRef?: DestroyRef;
//   },
// ): ControlToSignal<FormControlStatus> {
//   const destroyRef =
//     tryCatch(() => inject(DestroyRef, { optional: true }))[0] ?? options?.destroyRef;

//   if (isSignal(control)) {
//     assertInInjectionContext(controlStatusSignal_with_control_that_is_a_signal);
//     const resource = rxResource({
//       params: () => ({ control: control() }),
//       stream: ({ params }) => {
//         const { control } = params;
//         return control.statusChanges.pipe(
//           startWith(control.status),
//           takeUntilDestroyed(destroyRef),
//         );
//       },
//     });

//     const _signal = computed(() => {
//       return resource.value();
//     }) as ControlToSignal<FormControlStatus>;

//     _signal.unsubscribe = (): void => {
//       untracked(() => {
//         resource.destroy();
//       });
//     };

//     return _signal;
//   } else {
//     const _signal = signal<FormControlStatus | null | undefined>(undefined);

//     const subscription = control.statusChanges
//       .pipe(startWith(control.status))
//       .subscribe((status) => {
//         _signal.set(status);
//       });

//     (_signal as unknown as ControlToSignal<FormControlStatus>).unsubscribe = (): void =>
//       untracked(() => {
//         subscription.unsubscribe();
//       });

//     destroyRef?.onDestroy(() => {
//       subscription.unsubscribe();
//     });

//     return _signal as unknown as ControlToSignal<FormControlStatus>;
//   }
// }

// export function controlEventsSignal<T>(
//   control: SignalOrValue<AbstractControl<T>>,
//   options?: { destroyRef?: DestroyRef },
// ): ControlToSignal<ControlEvent<T>> {
//   const destroyRef =
//     tryCatch(() => inject(DestroyRef, { optional: true }))[0] ?? options?.destroyRef;

//   if (isSignal(control)) {
//     assertInInjectionContext(controlEventsSignal_with_control_that_is_a_signal);
//     const resource = rxResource({
//       params: () => ({ control: control() }),
//       stream: ({ params }) => {
//         const { control } = params;
//         return control.events.pipe(takeUntilDestroyed(destroyRef));
//       },
//     });

//     const _signal = computed(() => {
//       return resource.value();
//     }) as ControlToSignal<ControlEvent<T>>;

//     _signal.unsubscribe = (): void => {
//       untracked(() => {
//         resource.destroy();
//       });
//     };

//     return _signal;
//   } else {
//     const _signal = signal<ControlEvent<T> | null | undefined>(undefined);

//     const subscription = control.events.subscribe((value) => {
//       _signal.set(value);
//     });

//     (_signal as unknown as ControlToSignal<ControlEvent<T>>).unsubscribe = (): void =>
//       untracked(() => {
//         subscription.unsubscribe();
//       });

//     destroyRef?.onDestroy(() => {
//       subscription.unsubscribe();
//     });

//     return _signal as unknown as ControlToSignal<ControlEvent<T>>;
//   }
// }

// export type ControlSignalRef<T> = Signal<{ value: T; status: FormControlStatus }> & {
//   value: ControlToSignal<T>;
//   status: ControlToSignal<FormControlStatus>;
//   events: ControlToSignal<ControlEvent<T>>;
//   disabled: Signal<boolean>;
//   valid: Signal<boolean>;
//   invalid: Signal<boolean>;
//   touched: Signal<boolean>;
//   dirty: Signal<boolean>;
//   errors: Signal<Record<string, unknown> | null>;
//   unsubscribe(): void;
// };

// export function controlSignal<T>(
//   control: SignalOrValue<AbstractControl<T>>,
//   options?: { destroyRef?: DestroyRef },
// ): ControlSignalRef<T> {
//   const destroyRef =
//     tryCatch(() => inject(DestroyRef, { optional: true }))[0] ?? options?.destroyRef;

//   if (isSignal(control)) assertInInjectionContext(controlSignal_with_control_that_is_a_signal);

//   const valueSignal = controlValueSignal(control, { destroyRef });
//   const statusSignal = controlStatusSignal(control, { destroyRef });
//   const eventsSignal = controlEventsSignal(control, { destroyRef });

//   const combined = computed(() => ({
//     value: valueSignal(),
//     status: statusSignal(),
//     events: eventsSignal(),
//   }));

//   let isTouched = false;
//   let isDirty = false;

//   const ref = combined as unknown as ControlSignalRef<T>;

//   ref.value = valueSignal;
//   ref.status = statusSignal;
//   ref.events = eventsSignal;
//   ref.disabled = computed(() => statusSignal() === 'DISABLED');
//   ref.valid = computed(() => statusSignal() === 'VALID');
//   ref.invalid = computed(() => statusSignal() === 'INVALID');
//   ref.touched = computed(() => {
//     const status = eventsSignal();
//     if (status instanceof TouchedChangeEvent) isTouched = status.touched;
//     if (status instanceof FormResetEvent) isTouched = false;
//     return isTouched;
//   });
//   ref.dirty = computed(() => {
//     const status = eventsSignal();
//     if (status instanceof StatusChangeEvent) isDirty = true;
//     if (status instanceof PristineChangeEvent) isDirty = !status.pristine;
//     if (status instanceof FormResetEvent) isDirty = false;
//     return isDirty;
//   });
//   ref.errors = computed<ValidationErrors | null>(() => {
//     eventsSignal();
//     return signalOrValue(control).errors;
//   });
//   ref.unsubscribe = (): void => {
//     valueSignal.unsubscribe();
//     statusSignal.unsubscribe();
//     eventsSignal.unsubscribe();
//   };

//   return ref;
// }
