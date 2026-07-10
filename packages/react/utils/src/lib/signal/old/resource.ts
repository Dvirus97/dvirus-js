// import { batch } from './batch';
// import { signal } from './signal';
// import { computed } from './computed';
// import { effect } from './effect';
// import { SKIP, type ResourceOptions, type ResourceRef } from './types';

// const abortReason = '$__SignalResourceAbort__$';

// export function resource<T, R>(options: ResourceOptions<T, R>): ResourceRef<T> {
//   const value = signal<T | undefined>(undefined);
//   const status = signal<'idle' | 'loading' | 'resolved' | 'rejected'>('idle');
//   const error = signal<unknown | undefined>(undefined);
//   const isLoading = computed(() => status() === 'loading');

//   const reloadCounter = signal<number>(0);

//   const terminateEffect = effect(() => {
//     const reqParam = options.request();
//     reloadCounter();

//     if (reqParam === SKIP) {
//       batch(() => {
//         status.set('idle');
//         value.set(undefined);
//       });
//       return;
//     }

//     batch(() => {
//       status.set('loading');
//       error.set(undefined);
//     });

//     const controller = new AbortController();

//     options
//       .loader({
//         request: reqParam as Exclude<R, typeof SKIP>,
//         abortSignal: controller.signal,
//       })
//       .then((data) => {
//         if (controller.signal.aborted) return;

//         batch(() => {
//           value.set(data);
//           status.set('resolved');
//         });
//       })
//       .catch((err) => {
//         if (
//           err === abortReason ||
//           err.data === abortReason ||
//           err.message === abortReason ||
//           err.name === abortReason
//         )
//           return;

//         batch(() => {
//           error.set(err);
//           status.set('rejected');
//         });
//       });

//     return () => {
//       controller.abort(abortReason); // Drops the pending network task cleanly
//     };
//   });

//   return {
//     value: value,
//     status: status.asReadonly(),
//     error: error.asReadonly(),
//     isLoading: isLoading,
//     reload: () => reloadCounter.update((c) => (c > 1000 ? 1 : c + 1)),
//     destroy: () => terminateEffect(),
//   };
// }
