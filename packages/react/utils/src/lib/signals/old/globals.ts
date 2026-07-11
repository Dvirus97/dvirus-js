// // --- Global variables for managing Reactive state ---
// export const currentSubscriber = { current: null as (() => void) | null };
// export const currentEffect = { current: null as (() => void) | null };

// export const isBatching = { current: false };
// export const batchedSubscribers = new Set<() => void>();

// // Subscription notification function that supports Batch and prevents an effect from triggering itself
// export function notifySubscriber(cb: () => void) {
//   // Protection: if the effect currently running is the one trying to trigger itself, ignore to prevent loop
//   if (cb === currentEffect.current) {
//     return;
//   }

//   if (isBatching.current) {
//     batchedSubscribers.add(cb);
//   } else {
//     cb();
//   }
// }
