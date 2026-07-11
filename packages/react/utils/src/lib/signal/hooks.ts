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
} from '@dvirus-js/utils/signals';
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
/**
 * Conditionally subscribes to a signal for React re-rendering based on a
 * watch flag (or the global signals config). When watching is enabled the
 * returned function will be a wrapped signal that triggers React updates;
 * otherwise the original signal is returned unchanged.
 *
 * @template T - value type of the signal
 * @template TSignal - the concrete Signal type
 * @param {{watch: boolean | undefined; signal: TSignal}} options - options
 * @param options.watch - explicit per-hook override for watching signal changes
 * @param options.signal - the signal to optionally watch
 * @returns {TSignal} Either the original signal or a wrapper that triggers React updates
 */
function watchSignalChanges<T, TSignal extends Signal<T> = Signal<T>>(options: {
  watch: boolean | undefined;
  signal: TSignal;
}): TSignal {
  if (options.watch ?? getSignalsConfig().watchSignalChange) {
    useSignalValue(options.signal);
    return Object.assign(() => options.signal(), options.signal);
  } else {
    useSignalValue(dummySignal);
    return options.signal;
  }
}

/**
 * React hook that reads a Signal and subscribes the component to changes.
 * Uses React.useSyncExternalStore under the hood to integrate with React's
 * concurrent rendering model.
 *
 * @template T - the value type produced by the signal
 * @param {Signal<T>} sig - the signal to read and subscribe to
 * @returns {T} the current value of the provided signal
 */
export function useSignalValue<T>(sig: Signal<T>): T {
  return React.useSyncExternalStore(sig.subscribe, () => {
    return untracked(sig);
  });
}

/**
 * Create a locally scoped writable signal that lives for the lifetime of the
 * component. The returned signal can be used like any writable signal.
 *
 * This function create component-scoped signals.
 *
 * The optional `watch` flag controls whether updates
 * to this signal cause the component to re-render.
 *
 * @template T - type of the signal value
 * @param {T} initialValue - initial value for the local signal
 * @param {{readonly watch?: boolean}=} options - optional configuration
 * @param {boolean} [options.watch] - when true, hook subscribes and triggers re-renders
 * @returns {WritableSignal<T>} a writable signal bound to the component
 */
export function useSignal<T>(
  initialValue: T,
  options?: { readonly watch?: boolean },
): WritableSignal<T> {
  const sig = React.useMemo(() => signal<T>(initialValue), []);
  return watchSignalChanges({ watch: options?.watch, signal: sig });
  // return useLinkedSignal(
  //   () =>
  //     typeof initialValue === 'function'
  //       ? (initialValue as () => T)()
  //       : initialValue,
  //   options,
  // );
}

/**
 * Create a computed signal inside a React component. The computation function
 * is evaluated lazily and tracked; when dependencies change the computed value
 * updates. The optional `watch` flag controls whether component re-renders
 * occur when the computed value changes.
 *
 * @template T - computed value type
 * @param {() => T} computationFn - function that computes the value
 * @param {{readonly watch?: boolean}=} options - optional configuration
 * @param {boolean} [options.watch] - when true, hook subscribes and triggers re-renders
 * @returns {Signal<T>} a read-only signal representing the computed value
 */
export function useComputed<T>(
  computationFn: () => T,
  options?: { readonly watch?: boolean },
): Signal<T> {
  const sig = React.useMemo(() => computed(computationFn), []);
  return watchSignalChanges({ watch: options?.watch, signal: sig });
}

/**
 * Create a linked writable signal inside a React component. A linked signal is
 * a writable signal whose value is derived from a computation or a source/
 * computation pair and kept in sync automatically. This hook supports the
 * same overloads as `linkedSignal` and accepts an optional `watch` config to
 * control component re-renders.
 *
 * Overloads:
 * - useLinkedSignal(computation: () => T, config?)
 * - useLinkedSignal(options: LinkedSignalOptions<S, T>, config?)
 *
 * @template S - source type (when using options form)
 * @template T - linked signal value type
 * @param {LinkedSignalOptions<S, T> | (() => T)} optionsOrComputation - options object or plain computation
 * @param {{watch: boolean}=} config - optional watch configuration
 * @returns {WritableSignal<T>} a writable signal linked to the provided computation/source
 */
export function useLinkedSignal<T>(
  computation: () => T,
  config?: { watch?: boolean },
): WritableSignal<T>;
export function useLinkedSignal<S, T>(
  options: LinkedSignalOptions<S, T>,
  config?: { watch?: boolean },
): WritableSignal<T>;
export function useLinkedSignal<S, T>(
  optionsOrComputation: LinkedSignalOptions<S, T> | (() => T),
  config?: { watch?: boolean },
): WritableSignal<T> {
  const sig = React.useMemo(
    () => linkedSignal(optionsOrComputation as () => T),
    [],
  );
  return watchSignalChanges({ watch: config?.watch, signal: sig });
}

/**
 * Hook to create and manage a resource inside a React component. The hook
 * returns a ResourceRef that contains a value signal, status, loading flag,
 * and error signal. The resource is automatically destroyed shortly after
 * the component unmounts (unless re-mounted quickly), preventing memory leaks.
 *
 * This hook supports multiple overloads to accept resource loaders or stream
 * style definitions with or without parameters.
 *
 * @template T - the type of the resource value
 * @template R - the type of the request parameter (if applicable)
 * @param {ResourceLoaderWithParams<T, R> | ResourceLoaderWithoutParams<T> | ResourceStreamWithParams<T, R> | ResourceStreamWithoutParams<T>} options - resource loader/stream options
 * @param {{readonly watch?: boolean}=} config - optional configuration controlling whether React re-renders on resource signal updates
 * @param {boolean} [config.watch] - when true, the hook subscribes to resource signals and triggers React updates
 * @returns {ResourceRef<T>} a reference object for interacting with the resource
 */
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
