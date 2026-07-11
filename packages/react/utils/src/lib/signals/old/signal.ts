// import { currentSubscriber, notifySubscriber } from './globals';
// import { type WritableSignal, type Signal, SIGNAL } from './types';

// // --- 1. Main Signal function ---
// export function signal<T>(initialValue: T): WritableSignal<T> {
//   let value = initialValue;
//   const subscribers = new Set<() => void>();

//   // Getter: s()
//   const signalFn = () => {
//     if (currentSubscriber.current) {
//       subscribers.add(currentSubscriber.current);
//     }
//     return value;
//   };

//   const notify = () => {
//     const toNotify = Array.from(subscribers);
//     toNotify.forEach(notifySubscriber);
//   };

//   // s.set(newValue)
//   const set = (newValue: T) => {
//     if (value !== newValue) {
//       value = newValue;
//       notify();
//     }
//   };

//   // s.update(fn)
//   const update = (updateFn: (value: T) => T) => {
//     set(updateFn(value));
//   };

//   // Function for registering external listeners
//   const subscribe = (callback: () => void) => {
//     subscribers.add(callback);
//     return () => subscribers.delete(callback);
//   };

//   // s.asReadonly()
//   const asReadonly = (): Signal<T> => {
//     return Object.assign(() => signalFn(), {
//       [SIGNAL]: true as const,
//       subscribe,
//     });
//   };

//   return Object.assign<() => T, Omit<WritableSignal<T>, ''>>(signalFn, {
//     [SIGNAL]: true as const,
//     set,
//     update,
//     asReadonly,
//     subscribe,
//   }) satisfies WritableSignal<T>;
// }
