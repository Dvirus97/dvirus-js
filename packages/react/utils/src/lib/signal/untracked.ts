// import { currentSubscriber } from './globals';

// // --- 4. Untracked function (reading without dependency tracking) ---
// export function untracked<T>(fn: () => T): T {
//   const prevSubscriber = currentSubscriber.current;
//   currentSubscriber.current = null; // Temporary detachment of the listener
//   try {
//     return fn();
//   } finally {
//     currentSubscriber.current = prevSubscriber; // Returning the listener to its place
//   }
// }
