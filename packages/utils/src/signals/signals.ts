type Subscriber<T> = (value: T) => void;
type CleanupFn = () => void;
type UpdateFn<T> = (current: T) => T;

interface ComputeContext {
  setDirty: () => void;
  addSource: (cleanup: CleanupFn) => void;
}

/**
 * Internal marker used to identify values created as signals.
 */
export const SIGNAL: unique symbol = Symbol('SIGNAL');

/**
 * Returns true when a value is a signal produced by this module.
 */
export const isSignal = (value: unknown): value is Signal<unknown> =>
  typeof value === 'function' && SIGNAL in value;

/**
 * A read-only reactive value that can be subscribed to.
 */
export interface Signal<T> {
  (): T;
  [SIGNAL]: true;
  subscribe: (fn: Subscriber<T>) => CleanupFn;
}

/**
 * A writable reactive value that can be updated imperatively.
 */
export interface WritableSignal<T> extends Signal<T> {
  set: (value: T) => void;
  update: (fn: UpdateFn<T>) => void;
  asReadonly: () => Signal<T>;
}

/**
 * A handle returned by effect that can be destroyed to stop the effect.
 */
export interface EffectRef {
  destroy: CleanupFn;
}

type ResourceStatus = 'idle' | 'loading' | 'resolved' | 'error';

export type ResourceStreamItem<T> = { value: T } | { error: unknown };

/**
 * A reactive resource handle with status and value signals.
 */
export interface ResourceRef<T> {
  readonly value: Signal<T | undefined>;
  readonly status: Signal<ResourceStatus>;
  readonly error: Signal<unknown>;
  readonly isLoading: Signal<boolean>;
  set: (value: T) => void;
  update: (fn: UpdateFn<T | undefined>) => void;
  reload: () => void;
  destroy: CleanupFn;
}

/**
 * Parameters passed to a resource loader/stream when no params are needed.
 */
export interface ResourceLoaderParamsNoParams {
  abortSignal: AbortSignal;
  // previous: {
  //     status: ResourceStatus;
  // };
}

/**
 * Parameters passed to a resource loader/stream with optional params.
 */
export interface ResourceLoaderParams<R> extends ResourceLoaderParamsNoParams {
  params?: NoInfer<R>;
}

/**
 * Describes a resource loader that depends on parameters.
 */
export interface ResourceLoaderWithParams<T, R> {
  params: () => R;
  loader: (params: ResourceLoaderParams<R>) => Promise<T>;
}

/**
 * Describes a resource loader that does not depend on parameters.
 */
export interface ResourceLoaderWithoutParams<T> {
  loader: (params: ResourceLoaderParamsNoParams) => Promise<T>;
}

/**
 * Describes a resource stream that depends on parameters.
 */
export interface ResourceStreamWithParams<T, R> {
  params: () => R;
  stream: (
    params: ResourceLoaderParams<R>,
  ) => Signal<ResourceStreamItem<T> | undefined>;
}

/**
 * Describes a resource stream that does not depend on parameters.
 */
export interface ResourceStreamWithoutParams<T> {
  stream: (
    params: ResourceLoaderParamsNoParams,
  ) => Signal<ResourceStreamItem<T> | undefined>;
}

const STACK: ComputeContext[] = [];

// Batching support: while in a batch, notifications from signals are queued
// and flushed once the outermost batch completes. This reduces the number
// of subscriber calls when many signals are updated together.
let BATCH_LEVEL = 0;
const PENDING = new Map<
  object,
  { value: unknown; deliver: (v: unknown) => void }
>();

/**
 * Runs a callback while coalescing signal notifications until the batch ends.
 *
 * This is useful when several signals are updated in one logical step and you
 * want subscribers to react once instead of once per intermediate change.
 */
export const batch = <T>(fn: () => T): T => {
  BATCH_LEVEL++;
  try {
    return fn();
  } finally {
    BATCH_LEVEL--;
    if (BATCH_LEVEL === 0) {
      // Capture and clear pending before delivering to avoid re-entrancy
      const entries = Array.from(PENDING.entries());
      PENDING.clear();
      for (const [, { value, deliver }] of entries) {
        // deliver the last value for each reactive node
        deliver(value);
      }
    }
  }
};

/**
 * Runs a callback without registering any dependencies from the current context.
 */
export const untracked = <T>(fn: () => T): T => {
  const saved = STACK.splice(0, STACK.length);
  try {
    return fn();
  } finally {
    STACK.push(...saved);
  }
};

interface ReactiveNode<T> {
  read: Signal<T>;
  notify: (v: T) => void;
  hasSubscribers: () => boolean;
}

const createReactiveNode = <T>(
  getValue: () => T,
  onSubscribe?: () => void,
): ReactiveNode<T> => {
  const subs = new Set<Subscriber<T>>();
  let subscriberCount = 0;

  const track = (): void => {
    const current = STACK[STACK.length - 1];
    if (current) {
      subs.add(current.setDirty);
      current.addSource(() => {
        subs.delete(current.setDirty);
      });
    }
  };

  // unique key for this reactive node used by batching map
  const nodeKey = {};

  const notify = (v: T): void => {
    if (BATCH_LEVEL > 0) {
      // store latest value and a deliver function that will invoke current subscribers
      PENDING.set(nodeKey, {
        value: v,
        deliver: (val: unknown) => {
          // use a snapshot of subscribers to avoid mutation while iterating
          for (const fn of Array.from(subs)) fn(val as T);
        },
      });
      return;
    }

    for (const fn of Array.from(subs)) fn(v);
  };

  const hasSubscribers = (): boolean => subscriberCount > 0;

  const read = (): T => {
    track();
    return getValue();
  };

  const readSignal = Object.assign(read, {
    [SIGNAL]: true as const,
    subscribe: (fn: Subscriber<T>): CleanupFn => {
      subs.add(fn);
      subscriberCount++;
      onSubscribe?.();
      return () => {
        subs.delete(fn);
        subscriberCount--;
      };
    },
  });

  return { read: readSignal, notify, hasSubscribers };
};

/**
 * Creates a writable signal with an initial value.
 */
export const signal = <T>(initial: T): WritableSignal<T> => {
  let value: T = initial;

  const { read, notify } = createReactiveNode<T>(() => value);

  return Object.assign(read, {
    set: (v: T): void => {
      if (value === v) return;
      value = v;
      notify(v);
    },
    update: (fn: UpdateFn<T>): void => {
      const next = fn(value);
      if (value === next) return;
      value = next;
      notify(next);
    },
    asReadonly: (): Signal<T> => read,
  });
};

/**
 * Creates a reactive effect that re-runs when any read signal changes.
 */
export const effect = (fn: () => void | CleanupFn): EffectRef => {
  const sources = new Set<CleanupFn>();
  let destroyed = false;
  let userCleanup: CleanupFn | null = null;
  let scheduled = false;

  const execute = (): void => {
    scheduled = false;
    if (destroyed) return;

    if (userCleanup) {
      userCleanup();
      userCleanup = null;
    }

    sources.forEach((cleanup) => cleanup());
    sources.clear();

    // const onCleanup = (cleanupFn: CleanupFn): void => {
    //   userCleanup = cleanupFn;
    // };

    STACK.push({
      setDirty: () => {
        if (!destroyed && !scheduled) {
          scheduled = true;
          queueMicrotask(execute);
        }
      },
      addSource: (unsubscribe) => sources.add(unsubscribe),
    });

    // const cleanUp = fn();
    // if (typeof cleanUp == 'function') {
    //   userCleanup = cleanUp;
    // }
    try {
      const cleanUp = fn();

      if (typeof cleanUp === 'function') {
        if (destroyed) {
          cleanUp();
        } else {
          userCleanup = cleanUp;
        }
      }
    } finally {
      STACK.pop();
    }

    // STACK.pop();
  };

  execute();

  return {
    destroy(): void {
      destroyed = true;
      if (userCleanup) {
        userCleanup();
        userCleanup = null;
      }
      sources.forEach((cleanup) => cleanup());
      sources.clear();
    },
  };
};

/**
 * Creates a derived signal whose value is recomputed when its dependencies change.
 */
export const computed = <T>(fn: () => T): Signal<T> => {
  const sources = new Set<CleanupFn>();
  let cachedValue: T;
  let dirty = true;
  let notifyFn: (v: T) => void = () => void 0;

  const recompute = (): void => {
    sources.forEach((cleanup) => cleanup());
    sources.clear();

    STACK.push({
      setDirty: () => {
        if (dirty) return;
        dirty = true;
        const prev = cachedValue;
        recompute();
        if (cachedValue !== prev) {
          notifyFn(cachedValue);
        }
      },
      addSource: (unsubscribe) => sources.add(unsubscribe),
    });

    cachedValue = fn();
    dirty = false;
    STACK.pop();
  };

  const { read, notify } = createReactiveNode<T>(
    () => {
      if (dirty) recompute();
      return cachedValue;
    },
    () => {
      if (dirty) recompute();
    },
  );

  notifyFn = notify;

  return read;
};

export interface LinkedSignalOptions<S, T> {
  source: () => S;
  computation: (source: S, previous: { source: S; value: T } | undefined) => T;
}

/**
 * Creates a writable signal whose value can be explicitly overridden.
 *
 * When used with an options object, the signal recomputes from a source value.
 */
export function linkedSignal<T>(computation: () => T): WritableSignal<T>;
/**
 * Creates a linked signal that derives its value from the supplied source.
 */
export function linkedSignal<S, T>(
  options: LinkedSignalOptions<S, T>,
): WritableSignal<T>;
export function linkedSignal<S, T>(
  optionsOrComputation: LinkedSignalOptions<S, T> | (() => T),
): WritableSignal<T> {
  const isShorthand = typeof optionsOrComputation === 'function';
  const sourceFn = isShorthand ? undefined : optionsOrComputation.source;
  const computationFn = isShorthand
    ? (optionsOrComputation as () => T)
    : optionsOrComputation.computation;

  const sources = new Set<CleanupFn>();
  let cachedValue: T;
  let dirty = true;
  let overridden = false;
  let prevSource: { source: S; value: T } | undefined;
  let notifyFn: (v: T) => void = () => void 0;

  const recompute = (): void => {
    sources.forEach((cleanup) => cleanup());
    sources.clear();

    STACK.push({
      setDirty: () => {
        if (dirty) return;
        dirty = true;
        overridden = false;
        const prev = cachedValue;
        recompute();
        if (cachedValue !== prev) {
          notifyFn(cachedValue);
        }
      },
      addSource: (unsubscribe) => sources.add(unsubscribe),
    });

    if (isShorthand) {
      cachedValue = (computationFn as () => T)();
    } else {
      const sourceValue = sourceFn?.() as S;
      cachedValue = (
        computationFn as (
          source: S,
          previous: { source: S; value: T } | undefined,
        ) => T
      )(sourceValue, prevSource);
      prevSource = { source: sourceValue, value: cachedValue };
    }

    dirty = false;
    STACK.pop();
  };

  const { read, notify } = createReactiveNode<T>(
    () => {
      if (dirty && !overridden) recompute();
      return cachedValue;
    },
    () => {
      if (dirty && !overridden) recompute();
    },
  );

  notifyFn = notify;

  const writable = Object.assign(read, {
    set: (v: T): void => {
      if (cachedValue === v) return;
      cachedValue = v;
      overridden = true;
      dirty = false;
      notify(v);
    },
    update: (fn: UpdateFn<T>): void => {
      if (dirty && !overridden) recompute();
      writable.set(fn(cachedValue));
    },
    asReadonly: (): Signal<T> => read,
  });

  return writable;
}

class ResourceErrorStateError extends Error {
  constructor(cause: unknown) {
    const detail = cause instanceof Error ? `:\n${cause.message}` : '';
    super(`Cannot read resource value while in error state${detail}`, {
      cause,
    });
    this.name = 'ResourceErrorState';
  }
}

/**
 * Creates a reactive resource backed by a loader or stream.
 */
export function resource<T, R>(
  options: ResourceLoaderWithParams<T, R>,
): ResourceRef<T>;
/**
 * Creates a reactive resource backed by a loader without parameters.
 */
export function resource<T>(
  options: ResourceLoaderWithoutParams<T>,
): ResourceRef<T>;
/**
 * Creates a reactive resource backed by a stream with parameters.
 */
export function resource<T, R>(
  options: ResourceStreamWithParams<T, R>,
): ResourceRef<T>;
/**
 * Creates a reactive resource backed by a stream without parameters.
 */
export function resource<T>(
  options: ResourceStreamWithoutParams<T>,
): ResourceRef<T>;
export function resource<T, R>(
  options:
    | ResourceLoaderWithParams<T, R>
    | ResourceLoaderWithoutParams<T>
    | ResourceStreamWithParams<T, R>
    | ResourceStreamWithoutParams<T>,
): ResourceRef<T> {
  const _value = signal<T | undefined>(undefined);
  const status = signal<ResourceStatus>('idle');
  const error = signal<unknown>(undefined);
  const isLoading = computed(() => status() === 'loading');
  const reloadTrigger = signal(0);

  const value = computed((): T | undefined => {
    if (status() === 'error') {
      throw new ResourceErrorStateError(error());
    }
    return _value();
  });

  const setValue = (v: T): void => {
    _value.set(v);
    error.set(undefined);
    status.set('resolved');
  };

  const updateValue = (fn: UpdateFn<T | undefined>): void => {
    _value.update(fn);
    error.set(undefined);
    status.set('resolved');
  };

  const hasParams = 'params' in options;
  const isStream = 'stream' in options;

  if (isStream) {
    const streamSource = signal<
      Signal<ResourceStreamItem<T> | undefined> | undefined
    >(undefined);

    // Effect 1: call stream when params/reload change, store the returned signal
    const streamRef = effect(() => {
      reloadTrigger();

      const controller = new AbortController();
      // STACK[STACK.length - 1].addSource(onCleanup);

      const params = hasParams
        ? (
            options as
              | ResourceLoaderWithParams<T, R>
              | ResourceStreamWithParams<T, R>
          ).params()
        : undefined;

      status.set('loading');
      error.set(undefined);

      const streamFn = options.stream;

      const source = hasParams
        ? (streamFn as ResourceStreamWithParams<T, R>['stream'])({
            params: params,
            abortSignal: controller.signal,
          })
        : (streamFn as ResourceStreamWithoutParams<T>['stream'])({
            abortSignal: controller.signal,
          });

      streamSource.set(source);
      return () => controller.abort();
    });

    // Effect 2: read the stream signal reactively without re-calling stream
    const resultRef = effect(() => {
      const source = streamSource();
      if (!source) return;

      const result = source();
      if (result) {
        if ('error' in result && result.error !== undefined) {
          error.set(result.error);
          status.set('error');
        } else if ('value' in result) {
          _value.set(result.value);
          status.set('resolved');
        }
      }
    });

    return {
      value,
      status,
      error,
      isLoading,
      set: setValue,
      update: updateValue,
      reload: (): void => {
        reloadTrigger.update((n) => (n > 1000 ? 1 : n + 1));
      },
      destroy: (): void => {
        streamRef.destroy();
        resultRef.destroy();
      },
    };
  }

  const ref = effect(() => {
    reloadTrigger();

    const params = hasParams ? options.params() : undefined;

    status.set('loading');
    error.set(undefined);

    const controller = new AbortController();

    const loaderParams = hasParams
      ? { params: params, abortSignal: controller.signal }
      : { abortSignal: controller.signal };

    (options.loader as ResourceLoaderWithParams<T, R>['loader'])(
      loaderParams,
    ).then(
      (result) => {
        if (!controller.signal.aborted) {
          _value.set(result);
          status.set('resolved');
        }
      },
      (err) => {
        if (!controller.signal.aborted) {
          error.set(err);
          status.set('error');
        }
      },
    );

    return () => controller.abort();
  });

  return {
    value,
    status,
    error,
    isLoading,
    set: setValue,
    update: updateValue,
    reload: (): void => {
      reloadTrigger.update((n) => (n > 1000 ? 1 : n + 1));
    },
    destroy: () => ref.destroy(),
  };
}
