// import { currentSubscriber, notifySubscriber } from './globals';
// import { SIGNAL, type Signal } from './types';

// // --- 2. Computed function (read-only computed value) ---
// export function computed<T>(computationFn: () => T): Signal<T> {
//   let cachedValue: T;
//   let isDirty = true;
//   const subscribers = new Set<() => void>();

//   const handleDependencyChange = () => {
//     if (!isDirty) {
//       isDirty = true;
//       const toNotify = Array.from(subscribers);
//       toNotify.forEach(notifySubscriber);
//     }
//   };

//   const runComputation = (): T => {
//     const prevSubscriber = currentSubscriber.current;
//     currentSubscriber.current = handleDependencyChange;
//     try {
//       cachedValue = computationFn();
//       isDirty = false;
//       return cachedValue;
//     } finally {
//       currentSubscriber.current = prevSubscriber;
//     }
//   };

//   // Getter: c()
//   const computedFn = () => {
//     if (currentSubscriber.current) {
//       subscribers.add(currentSubscriber.current);
//     }
//     if (isDirty) {
//       runComputation();
//     }
//     return cachedValue;
//   };

//   const subscribe = (callback: () => void) => {
//     subscribers.add(callback);
//     return () => subscribers.delete(callback);
//   };

//   return Object.assign<() => T, Omit<Signal<T>, ''>>(computedFn, {
//     [SIGNAL]: true as const,
//     subscribe,
//   }) satisfies Signal<T>;
// }
