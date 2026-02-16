import { isSignal, signal, Signal, WritableSignal } from '@angular/core';
import { ObjectType } from './object-type';


/**
 * Represents an object where each property is a read-only Signal.
 * Useful for mapping state objects to their signal equivalents.
 */
export type SignalObj<T extends ObjectType = ObjectType> = {
  [Key in keyof T]: Signal<T[Key]>;
};

/**
 * Represents an object where each property is a WritableSignal.
 * Allows for direct modification of the signal values within the object structure.
 */
export type SignalObjWritable<T extends ObjectType> = {
  [Key in keyof T]: WritableSignal<T[Key]>;
};

/**
 * A type representing either a Signal of type T or the raw value of type T.
 * Useful for inputs that can accept both static values and reactive signals.
 */
export type SignalOrValue<T> = Signal<T> | T;

/**
 * Represents an object where each property can be either a Signal of a certain type
 * or the raw value of that type.
 *
 * @template TValues The type of the values contained within the SignalOrValue properties.
 *                   Defaults to a union of ObjectType, string, number, or undefined.
 */
export type SignalOrValueObj<TValues = ObjectType | string | number | boolean | undefined> =
  TValues extends object
    ? { [Key in keyof TValues]: SignalOrValue<TValues[Key]> }
    : Record<string, SignalOrValue<TValues>>;

/**
 * Converts a plain object into a writable signal object.
 * Each property of the source object becomes a WritableSignal initialized with the property's value.
 *
 * @param src - The source object to convert.
 * @returns An object with the same keys as the source, but with values wrapped in WritableSignals.
 */
export function toSignalObj<T extends ObjectType>(src: T): SignalObjWritable<T> {
  return Object.entries(src).reduce(
    (prev, [key, value]) => ({ ...prev, [key]: signal(value) }),
    {} as SignalObjWritable<T>,
  );
}

/**
 * Converts a signal object into a plain object.
 * Each property of the signal object becomes a value from the signal.
 *
 * @param src - The signal object to convert.
 * @returns An object with the same keys as the source, but with values from the signals.
 */
export function fromSignalObj<TData extends ObjectType>(src: SignalOrValueObj<TData>): TData {
  return Object.entries(src).reduce<TData>(
    (prev, [key, $value]) => ({ ...prev, [key]: signalOrValue($value) }),
    {} as TData,
  );
}

/**
 * Unwraps a value that might be a Signal.
 * If the input is a Signal, it returns the signal's value.
 * If the input is a raw value, it returns the value itself.
 *
 * @param value - The signal or value to unwrap.
 * @returns The raw value of type T.
 */
export function signalOrValue<T>(value: SignalOrValue<T>): T {
  return isSignal(value) ? value() : value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function signalOrFunction<T, FnArgs extends any[] = []>(
  value: SignalOrValue<T> | ((...args: FnArgs) => T),
  ...fnArgs: FnArgs
): T {
  let res = value;
  if (isSignal(res)) {
    res = res();
  }
  if (typeof res == 'function') {
    res = (res as (...args: FnArgs[]) => T)(...fnArgs);
  }

  return res;
}

// function main() {
//   const signalOrValue1: SignalOrValue<number> = signal(42);
//   const signalOrValue2: SignalOrValue<string> = 'Hello, World!';

//   console.log(signalOrValue(signalOrValue1)); // 42
//   console.log(signalOrValue(signalOrValue2)); // "Hello, World!"

//   // #############################################################

//   const signalOrFunction1: SignalOrValue<number> | (() => number) = signal(100);
//   const signalOrFunction2: SignalOrValue<number> | (() => number) = () => 200;
//   const signalOrFunction3: SignalOrValue<number> | (() => number) = 300;
//   const signalOrFunction4: SignalOrValue<number> | ((a: number, b: number) => number) = (a, b) => {
//     return a + b;
//   };

//   console.log(signalOrFunction(signalOrFunction1)); // 100
//   console.log(signalOrFunction(signalOrFunction2)); // 200
//   console.log(signalOrFunction(signalOrFunction3)); // 300
//   console.log(signalOrFunction(signalOrFunction4, 5, 10)); // 15

//   // #############################################################

//   const signalObj1: SignalObj<{ a: number; b: string }> = {
//     a: signal(10),
//     b: computed(() => 'Test'),
//   };
//   console.log(signalObj1); // { a: Signal<number>, b: Signal<string> }

//   const signalObjWritable1: SignalObjWritable<{ a: number; b: string }> = toSignalObj({
//     a: 10,
//     b: 'Test',
//   });
//   console.log(signalObjWritable1); // { a: WritableSignal<number>, b: WritableSignal<string> }

//   const plainObj1 = fromSignalObj(signalObj1);
//   console.log(plainObj1); // { a: 10, b: 'Test' }

//   const plainObj2 = fromSignalObj(signalObjWritable1);
//   console.log(plainObj2); // { a: 10, b: 'Test' }
// }
