// import { useSignal } from "@/hooks/useState";
// // import { tryCatchAsync } from "@dvirus-js/utils";
// import { useCallback, useEffect, useRef } from "react";

// import {
//     Http,
//     tryCatchAsync,
// } from "../../../../../GitHub/dvirusJs-nx2/dvirus-js/packages/utils/src/index";
// import { DvirusJsToaster } from "@/components/dvirus-toaster";
// import type { WritableSignal } from "./signals.type";

// export interface UseFetchResult<T> {
//     value: WritableSignal<T | undefined>;
//     isLoading: WritableSignal<boolean>;
//     error: WritableSignal<Error | undefined>;
//     isRateLimited: WritableSignal<boolean>;
//     abort: () => void;
// }

// export function useFetch<T>(url: string): UseFetchResult<T> {
//     const value = useSignal<T | null>(null);
//     const isLoading = useSignal(false);
//     const error = useSignal<Error | null>(null);
//     const isRateLimited = useSignal(false);

//     const abortControllerRef = useRef<AbortController | null>(null);

//     const abort = useCallback(() => {
//         abortControllerRef.current?.abort();
//     }, []);

//     useEffect(() => {
//         const controller = new AbortController();
//         abortControllerRef.current = controller;

//         async function fetchData() {
//             isLoading.set(true);
//             error.set(null);

//             const [fetchVal, fetchErr] = await tryCatchAsync<
//                 Http.Response<T>,
//                 Http.Response<{ message: string }>
//             >(Http.get<T>(url, { signal: controller.signal }));

//             if (controller.signal.aborted) return;
//             if (!fetchErr) {
//                 value.set(fetchVal.data);
//                 isRateLimited.set(false);
//                 return isLoading.set(false);
//             }

//             const status = fetchErr.status ? `${fetchErr.status}: ` : "";
//             const errorMessage = `${status}${fetchErr.data.message || fetchErr.statusText || "An error occurred while fetching data"}`;

//             error.set({ name: "FetchError", message: errorMessage });
//             if (fetchErr.status === 429) isRateLimited.set(true);
//             DvirusJsToaster.error(errorMessage);
//             isLoading.set(false);
//         }

//         fetchData();

//         return () => {
//             controller.abort("[useFetch]: Abort - unmount (cleanup)");
//             if (abortControllerRef.current === controller) {
//                 abortControllerRef.current = null;
//             }
//             isLoading.set(false);
//         };
//         // data/error/loading are custom wrapper objects with unstable identity.
//         // This effect is intentionally keyed by url changes only.
//     }, [url]);

//     return { value, isLoading, error, abort, isRateLimited };
// }
