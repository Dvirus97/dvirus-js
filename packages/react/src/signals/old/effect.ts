// import { currentSubscriber, currentEffect } from './globals';

// // --- 3. Effect function (tracking and running side-effect code) ---
// export function effect(effectFn: () => void | (() => void)): () => void {
//   let active = true;
//   let isRunning = false; // Internal protection flag to prevent infinite loops
//   let cleanupFn: (() => void) | null = null; // Cleanup function from previous run

//   const runEffect = () => {
//     if (!active) return;

//     // Direct infinite loop detection at runtime
//     if (isRunning) {
//       throw new Error(
//         `[Signals Error] Detected infinite loop inside an effect. An effect cannot update a signal that it depends on.`,
//       );
//     }

//     // Before running the effect, if there is a cleanup function from the previous run and the effect is still active, run it
//     if (cleanupFn) {
//       try {
//         cleanupFn();
//       } catch (err) {
//         console.error('[Signals Cleanup Error]:', err);
//       }
//       cleanupFn = null;
//     }

//     const prevSubscriber = currentSubscriber.current;
//     currentSubscriber.current = runEffect;
//     currentEffect.current = runEffect; // Update the active effect globally

//     isRunning = true;
//     try {
//       const result = effectFn();
//       // If the function returned a function, save it as cleanup for next time
//       if (typeof result === 'function') {
//         cleanupFn = result;
//       } else {
//         cleanupFn = null;
//       }
//     } finally {
//       isRunning = false;
//       currentSubscriber.current = prevSubscriber;
//       currentEffect.current = null;
//     }
//   };

//   runEffect();

//   return () => {
//     if (!active) return;
//     active = false;
//     if (cleanupFn) {
//       cleanupFn();
//       cleanupFn = null;
//     }
//   };
// }
