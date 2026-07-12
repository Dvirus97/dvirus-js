// import { WritableSignal } from './types';
// import { signal } from './signal';
// import { untracked } from './untracked';
// import { effect } from './effect';

// export interface LinkedSignalOptions<S, T> {
//   source: () => S;
//   computation: (source: S, previous: { source: S; value: T } | undefined) => T;
// }

// export interface LinkedSignalConfig<T> {
//   equal?: (previous: T, current: T) => boolean;
// }

// export function linkedSignal<T>(
//   computation: () => T,
//   config?: LinkedSignalConfig<T>,
// ): WritableSignal<T>;

// export function linkedSignal<S, T>(
//   options: LinkedSignalOptions<S, T>,
//   config?: LinkedSignalConfig<T>,
// ): WritableSignal<T>;

// export function linkedSignal<S, T>(
//   optionsOrComputation: LinkedSignalOptions<S, T> | (() => T),
//   config?: LinkedSignalConfig<T>,
// ): WritableSignal<T> {
//   const equalizer = config?.equal ?? ((a, b) => Object.is(a, b));

//   let sourceFn: () => unknown;
//   let computationFn: (
//     source: unknown,
//     previous: { source: unknown; value: unknown } | undefined,
//   ) => unknown;

//   if (typeof optionsOrComputation === 'function') {
//     sourceFn = optionsOrComputation as () => unknown;
//     computationFn = (source) => source;
//   } else {
//     const opts = optionsOrComputation as LinkedSignalOptions<unknown, unknown>;
//     sourceFn = opts.source;
//     computationFn = opts.computation as typeof computationFn;
//   }

//   const initialSource = untracked(() => sourceFn());

//   let lastValue = computationFn(initialSource, undefined);
//   let lastSource = initialSource;

//   const innerSignal = signal<unknown>(lastValue);

//   effect(() => {
//     const currentSource = sourceFn();

//     const previousState = { source: lastSource, value: lastValue };
//     const newValue = computationFn(currentSource, previousState);

//     if (!equalizer(lastValue as T, newValue as T)) {
//       lastValue = newValue;
//       lastSource = currentSource;

//       untracked(() => {
//         innerSignal.set(newValue);
//       });
//     } else {
//       lastSource = currentSource;
//     }
//   });

//   return innerSignal as WritableSignal<T>;
// }

// // /**
// //  * Options for linkedSignal when source and value types may differ.
// //  */
// // export interface LinkedSignalOptions<S, T> {
// //   /** Function that returns the source value of type S. */
// //   source: () => S;
// //   /**
// //    * Transformation function that receives the current source value and the
// //    * previous linked value (or undefined on first call) and returns the new linked value of type T.
// //    */
// //   computation: (previous: T | undefined, current: S) => T;
// //   /** Optional function to determine if the new value is different from the previous value. */
// //   equalizer?: (previous: T, current: T) => boolean;
// // }

// // /**
// //  * Creates a writable signal whose value is automatically kept in sync with
// //  * a source or a computation.
// //  *
// //  * @overload
// //  * @param computation A pure function returning T. The returned signal tracks
// //  *                    the dependencies of this function and can be overridden
// //  *                    via .set()/.update().
// //  * @param equalizer   Optional function to determine if the new value is different from the previous value.
// //  * @returns A writable signal linked to the computation.
// //  *
// //  * @overload
// //  * @param options An object containing a source function, a computation
// //  *                that transforms the source (and previous linked value) into the
// //  *                linked value, and an optional equalizer.
// //  * @returns A writable signal linked to the source.
// //  *
// //  * @overload
// //  * @param optionsOrComputation Either a source function (() => T) with an
// //  *                             optional equalizer, or a LinkedSignalOptions
// //  *                             object.
// //  * @param equalizer           Optional function to determine if the new value is different from the previous value.
// //  *                            Only used when the first argument is a function.
// //  * @returns A writable signal linked to the provided source/options.
// //  */
// // export function linkedSignal<T>(
// //   computation: () => T,
// //   equalizer?: (previous: T, current: T) => boolean
// // ): WritableSignal<T>;
// // export function linkedSignal<S, T>(
// //   options: LinkedSignalOptions<S, T>
// // ): WritableSignal<T>;
// // export function linkedSignal<S, T>(
// //   optionsOrComputation: LinkedSignalOptions<S, T> | (() => T),
// //   equalizer?: (previous: T, current: T) => boolean
// // ): WritableSignal<T> {
// //   // Normalize arguments
// //   let sourceFn: () => any;
// //   let computationFn: ((previous: any, current: any) => any) | undefined;
// //   let optsEqualizer: ((previous: any, current: any) => boolean) | undefined;

// //   if (typeof optionsOrComputation === 'function') {
// //     // Overload 1: plain computation (() => T)
// //     sourceFn = optionsOrComputation as () => any;
// //     // For plain computation, we ignore the previous value and just return the source.
// //     // Note: the computation function signature is (previous, source) => T, but we want to ignore previous.
// //     computationFn = (_previous, source) => source;
// //     optsEqualizer = equalizer as any;
// //   } else {
// //     // Overload 2: options object
// //     const opts = optionsOrComputation as LinkedSignalOptions<any, any>;
// //     sourceFn = opts.source;
// //     computationFn = opts.computation as (previous: any, current: any) => any;
// //     optsEqualizer = opts.equalizer ?? equalizer;
// //   }

// //   // Use the provided equalizer or fall back to Object.is (which is === for primitives)
// //   const effectiveEqualizer: (previous: any, current: any) => boolean =
// //     optsEqualizer ?? ((prev, curr) => Object.is(prev, curr));

// //   // 1. Create an underlying standard writable signal
// //   // We initialize it using an untracked call to avoid picking up outer subscribers during instantiation
// //   const initialSource = untracked(() => sourceFn());
// //   let lastComputedValue: any;

// //   // For the first computation, we need to compute the initial value.
// //   if (computationFn) {
// //     // For the first computation, previous is undefined
// //     lastComputedValue = computationFn(undefined, initialSource);
// //   } else {
// //     // If no computation function, then the linked value is the source itself (identity)
// //     lastComputedValue = initialSource;
// //   }

// //   const innerSignal = signal<any>(lastComputedValue);

// //   // 2. Establish a background effect that syncs the source onto the inner state
// //   effect(() => {
// //     const currentSource = sourceFn();
// //     let computedValue: any;

// //     if (computationFn) {
// //       computedValue = computationFn(lastComputedValue, currentSource);
// //     } else {
// //       // Identity: the linked value is the source itself
// //       computedValue = currentSource;
// //     }

// //     // Check if the computed value is different from the last computed value we processed (using the equalizer)
// //     if (!effectiveEqualizer(lastComputedValue, computedValue)) {
// //       lastComputedValue = computedValue;
// //       // Overwrite the local state whenever any underlying dependencies inside sourceFn update
// //       untracked(() => {
// //         innerSignal.set(computedValue);
// //       });
// //     }
// //   });

// //   // 3. Return the inner signal which already contains function getters, .set(), and .update()
// //   return innerSignal as WritableSignal<T>;
// // }
