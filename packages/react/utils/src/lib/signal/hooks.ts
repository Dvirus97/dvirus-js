import {
  computed,
  linkedSignal,
  LinkedSignalOptions,
  resource,
  ResourceLoaderWithoutParams,
  ResourceLoaderWithParams,
  ResourceRef,
  ResourceStreamWithoutParams,
  ResourceStreamWithParams,
  Signal,
  signal,
  untracked,
  WritableSignal,
} from '@dvirus-js/utils';
import * as React from 'react';
import { getSignalsConfig } from './context';
// import { computed } from './computed';
// import { getSignalsConfig } from './context';
// import { currentSubscriber } from './globals';
// import {
//   linkedSignal,
//   LinkedSignalConfig,
//   LinkedSignalOptions,
// } from './linked-signal';
// import { resource } from './resource';
// import { signal } from './signal';
// import {
//   type ResourceOptions,
//   type ResourceRef,
//   type Signal,
//   type WritableSignal,
// } from './types';

const dummySignal = signal<false>(false);
function watchSignalChanges<T, TSignal extends Signal<T> = Signal<T>>(options: {
  watch: boolean | undefined;
  signal: TSignal;
}): TSignal {
  if (options.watch ?? getSignalsConfig().watchSignalChange) {
    useSignal(options.signal);
    return Object.assign(() => options.signal(), options.signal);
  } else {
    useSignal(dummySignal);
    return options.signal;
  }
}

export function useSignal<T>(sig: Signal<T>): T {
  return React.useSyncExternalStore(sig.subscribe, () => {
    // const prevSubscriber = currentSubscriber.current;
    // currentSubscriber.current = null; // Preventing double subscription during value extraction in React
    // const val = sig();
    // currentSubscriber.current = prevSubscriber;
    const val = untracked(sig);
    return val;
  });
}

export function useLocalSignal<T>(
  initialValue: T,
  options?: { readonly watch?: boolean },
): WritableSignal<T> {
  const sig = React.useMemo(() => signal<T>(initialValue), []);
  return watchSignalChanges({ watch: options?.watch, signal: sig });
}

export function useComputed<T>(
  computationFn: () => T,
  options?: { readonly watch?: boolean },
): Signal<T> {
  const sig = React.useMemo(() => computed(computationFn), []);
  return watchSignalChanges({ watch: options?.watch, signal: sig });
}

export function useLinkedSignal<T>(
  computation: () => T,
  config?: { watch: boolean },
): WritableSignal<T>;
export function useLinkedSignal<S, T>(
  options: LinkedSignalOptions<S, T>,
  config?: { watch: boolean },
): WritableSignal<T>;
export function useLinkedSignal<S, T>(
  optionsOrComputation: LinkedSignalOptions<S, T> | (() => T),
  config?: { watch: boolean },
): WritableSignal<T> {
  const sig = React.useMemo(
    () => linkedSignal(optionsOrComputation as () => T),
    [],
  );
  return watchSignalChanges({ watch: config?.watch, signal: sig });
}

export function useResource<T, R>(
  options: ResourceLoaderWithParams<T, R>,
): ResourceRef<T>;
export function useResource<T>(
  options: ResourceLoaderWithoutParams<T>,
): ResourceRef<T>;
export function useResource<T, R>(
  options: ResourceStreamWithParams<T, R>,
): ResourceRef<T>;
export function useResource<T>(
  options: ResourceStreamWithoutParams<T>,
): ResourceRef<T>;
export function useResource<T, R>(
  options:
    | ResourceLoaderWithParams<T, R>
    | ResourceLoaderWithoutParams<T>
    | ResourceStreamWithParams<T, R>
    | ResourceStreamWithoutParams<T>,
  config?: { readonly watch?: boolean },
): ResourceRef<T> {
  const resourceRef = React.useRef<ResourceRef<T> | null>(null);
  const isMounted = React.useRef(false);

  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  if (resourceRef.current === null) {
    resourceRef.current = resource(
      optionsRef.current as ResourceLoaderWithParams<T, R>,
    );
  }

  // prettier-ignore
  { watchSignalChanges({ watch: config?.watch, signal: resourceRef.current.value });
    watchSignalChanges({ watch: config?.watch, signal: resourceRef.current.isLoading });
    watchSignalChanges({ watch: config?.watch, signal: resourceRef.current.error }); }

  React.useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;

      setTimeout(() => {
        if (!isMounted.current && resourceRef.current) {
          resourceRef.current.destroy();
          resourceRef.current = null;
        } else {
          isMounted.current = true;
        }
      }, 0);
    };
  }, []);

  return resourceRef.current;
}
