import { computed, Signal, signal, untracked, WritableSignal } from "@angular/core";

/**
 * Creates a `WritableSignal` whose value is derived from `fn` (like `computed`),
 * but can also be overridden manually via `.set()` / `.update()`.
 * When the reactive dependencies inside `fn` change, the signal resets to the new derived value.
 *
 * Angular-16 compatible alternative to `linkedSignal` (Angular 19+).
 */
export function writableSignal<T>(fn: () => T): WritableSignal<T> {
  // _source tracks the derived value reactively.
  const _source = computed(fn);

  // _override stores the manually set value alongside the source snapshot it was set against.
  // When the source changes, the snapshot no longer matches and the override is discarded.
  const _override = signal<{ src: T; val: T } | undefined>(undefined);

  const result = computed<T>(() => {
    const src = _source();
    const ov = _override();
    if (ov !== undefined && Object.is(ov.src, src)) {
      return ov.val;
    }
    return src;
  }); 

  return Object.assign(result, {
    set(v: T): void {
      _override.set({ src: untracked(_source), val: v });
    },
    update(updater: (value: T) => T): void {
      _override.set({ src: untracked(_source), val: updater(untracked(result)) });
    },
    asReadonly(): Signal<T> {
      return result;
    },
  }) as WritableSignal<T>;
}
