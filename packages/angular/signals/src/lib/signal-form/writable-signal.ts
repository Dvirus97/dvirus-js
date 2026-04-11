import { computed, Signal, signal, untracked, WritableSignal } from "@angular/core";

export function writableSignal<T>(fn: () => T): WritableSignal<T> {
  const writable = signal<T | undefined>(undefined);
  let lastFn: T;

  const comp = computed(() => {
    const writableValue = writable() as T;
    const fnValue = fn();
    if (fnValue != lastFn) {
      lastFn = fnValue;
      untracked(() => writable.set(fnValue));
      return fnValue;
    }
    return writableValue;
  });

  return Object.assign(comp, {
    set(v: T): void {
      writable.set(v);
    },
    update(fn: (value: T | undefined) => T | undefined): void {
      writable.update(fn);
    },
    asReadonly(): Signal<T> {
      return comp;
    },
  }) as WritableSignal<T>;
}
