// export interface Signal<T> {
//   (): T;
//   subscribe(callback: () => void): () => void;
//   [SIGNAL]: true;
// }

// export interface WritableSignal<T> extends Signal<T> {
//   set(newValue: T): void;
//   update(updateFn: (value: T) => T): void;
//   asReadonly(): Signal<T>;
// }

// // Type that accepts either a direct signal or a function that returns a value
// export type SignalOrFn<T> = Signal<T> | (() => T);

// export interface ResourceRef<T> {
//   value: WritableSignal<T | undefined>;
//   status: Signal<'idle' | 'loading' | 'resolved' | 'rejected'>;
//   isLoading: Signal<boolean>;
//   error: Signal<unknown | undefined>;
//   reload(): void;
//   destroy(): void;
// }

// export const SKIP = Symbol('SKIP_RESOURCE_LOADER');
// export interface ResourceOptions<T, R> {
//   request: () => R | typeof SKIP;
//   loader: (param: {
//     request: Exclude<R, typeof SKIP>;
//     abortSignal: AbortSignal;
//   }) => Promise<T>;
// }

// export const SIGNAL = Symbol('SIGNAL');

// export function isSignal<T>(value: unknown): value is Signal<T> {
//   return (
//     typeof value === 'function' && SIGNAL in value && value[SIGNAL] === true
//   );
// }
