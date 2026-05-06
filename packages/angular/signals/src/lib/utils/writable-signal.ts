import { computed, Signal, signal, untracked, WritableSignal } from "@angular/core";

/**
 * Creates a `WritableSignal` whose value is derived from `fn` (like `computed`),
 * but can also be overridden manually via `.set()` / `.update()`.
 * When the reactive dependencies inside `fn` change, the signal resets to the new derived value.
 *
 * Angular-16 compatible alternative to `linkedSignal` (Angular 19+).
 */
export function writableSignal<T>(fn: () => T): WritableSignal<T> {
  // Create a fresh token whenever the source recomputes, even if the value is equal.
  const sourceState = computed(() => ({ value: fn() }));

  // Manual overrides are only valid for the source-state token they were set against.
  const override = signal<{ state: { value: T }; value: T } | undefined>(
    undefined,
  );

  const result = computed<T>(() => {
    const state = sourceState();
    const currentOverride = override();
    if (currentOverride !== undefined && currentOverride.state === state) {
      return currentOverride.value;
    }
    return state.value;
  });

  return Object.assign(result, {
    set(v: T): void {
      override.set({ state: untracked(sourceState), value: v });
    },
    update(updater: (value: T) => T): void {
      override.set({
        state: untracked(sourceState),
        value: updater(untracked(result)),
      });
    },
    asReadonly(): Signal<T> {
      return result;
    },
  }) as WritableSignal<T>;
}
