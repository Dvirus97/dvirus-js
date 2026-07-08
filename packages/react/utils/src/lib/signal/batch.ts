// // --- Batch function for unifying updates ---
// import { isBatching, batchedSubscribers } from './globals';

// export function batch(fn: () => void): void {
//   if (isBatching.current) {
//     fn();
//     return;
//   }

//   isBatching.current = true;
//   try {
//     fn();
//   } finally {
//     isBatching.current = false;
//     const queue = Array.from(batchedSubscribers);
//     batchedSubscribers.clear();
//     queue.forEach((cb) => cb());
//   }
// }
