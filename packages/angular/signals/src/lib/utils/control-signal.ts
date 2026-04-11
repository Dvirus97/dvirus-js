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
  FormControlStatus,
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
  /** Signal returning the most recent control event (Angular v18+), or `null` on older versions. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  events: Signal<any>;
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
  control: AbstractControl<T>| FormControl<T>,
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
  destroyRef?.onDestroy(() => unsubscribe());

  const $value = signal<T | null | undefined>(undefined);
  const $status = signal<FormControlStatus | null | undefined>(undefined);
  // Incremented on every value/status change to trigger reactivity for
  // properties that are read directly from the control (touched, dirty, errors).
  const $tick = signal(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const $events = signal<any>(undefined);

  subscriptions.push(
    control.valueChanges
      .pipe(startWith(control.value))
      .subscribe((x) => untracked(() => { $value.set(x); $tick.update(v => v + 1); })),

    control.statusChanges
      .pipe(startWith(control.status))
      .subscribe((x) => untracked(() => { $status.set(x); $tick.update(v => v + 1); })),
  );

  // Subscribe to control.events if available (Angular v18+)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctrl = control as any;
  if (ctrl.events && typeof ctrl.events.subscribe === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subscriptions.push(ctrl.events.subscribe((x: any) => untracked(() => { $events.set(x); $tick.update(v => v + 1); })));
  }

  const invalid = computed(() => $status() === 'INVALID');
  const disabled = computed(() => $status() === 'DISABLED');
  const valid = computed(() => $status() === 'VALID');
  const touched = computed(() => { $tick(); $events(); return control.touched; });
  const errors = computed<ValidationErrors | null>(() => { $tick(); $events(); return control.errors; });
  const firstErrorKey = computed<string | null>(() => Object.keys(errors() ?? {})[0] ?? null);
  const touchedAndInvalid = computed(() => touched() && invalid());
  const dirty = computed(() => { $tick(); $events(); return control.dirty; });

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
