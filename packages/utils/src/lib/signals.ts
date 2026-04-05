type Subscriber<T> = (value: T) => void;
type CleanupFn = () => void;
type UpdateFn<T> = (current: T) => T;

interface ComputeContext {
  setDirty: () => void;
  addSource: (cleanup: CleanupFn) => void;
}

export const SIGNAL: unique symbol = Symbol('SIGNAL');

export const isSignal = (value: unknown): value is Signal<unknown> =>
  typeof value === 'function' && SIGNAL in value;

export interface Signal<T> {
  (): T;
  [SIGNAL]: true;
  subscribe: (fn: Subscriber<T>) => CleanupFn;
}

export interface WritableSignal<T> extends Signal<T> {
  set: (value: T) => void;
  update: (fn: UpdateFn<T>) => void;
  asReadonly: () => Signal<T>;
}

export interface EffectRef {
  destroy: CleanupFn;
}

type ResourceStatus = 'idle' | 'loading' | 'resolved' | 'error';

export type ResourceStreamItem<T> = { value: T } | { error: unknown };

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

export interface ResourceLoaderParamsNoParams {
  abortSignal: AbortSignal;
  // previous: {
  //     status: ResourceStatus;
  // };
}
export interface ResourceLoaderParams<R> extends ResourceLoaderParamsNoParams {
  params?: NoInfer<R>;
}

interface ResourceLoaderWithParams<T, R> {
  params: () => R;
  loader: (params: ResourceLoaderParams<R>) => Promise<T>;
}

interface ResourceLoaderWithoutParams<T> {
  loader: (params: ResourceLoaderParamsNoParams) => Promise<T>;
}

interface ResourceStreamWithParams<T, R> {
  params: () => R;
  stream: (params: ResourceLoaderParams<R>) => Signal<ResourceStreamItem<T> | undefined>;
}

interface ResourceStreamWithoutParams<T> {
  stream: (params: ResourceLoaderParamsNoParams) => Signal<ResourceStreamItem<T> | undefined>;
}

const STACK: ComputeContext[] = [];

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

const createReactiveNode = <T>(getValue: () => T, onSubscribe?: () => void): ReactiveNode<T> => {
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

  const notify = (v: T): void => {
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

export const effect = (fn: (onCleanup: (cleanupFn: CleanupFn) => void) => void): EffectRef => {
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

    const onCleanup = (cleanupFn: CleanupFn): void => {
      userCleanup = cleanupFn;
    };

    STACK.push({
      setDirty: () => {
        if (!destroyed && !scheduled) {
          scheduled = true;
          queueMicrotask(execute);
        }
      },
      addSource: (unsubscribe) => sources.add(unsubscribe),
    });

    fn(onCleanup);
    STACK.pop();
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

interface LinkedSignalOptions<S, T> {
  source: () => S;
  computation: (source: S, previous: { source: S; value: T } | undefined) => T;
}

export function linkedSignal<T>(computation: () => T): WritableSignal<T>;
export function linkedSignal<S, T>(options: LinkedSignalOptions<S, T>): WritableSignal<T>;
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
        computationFn as (source: S, previous: { source: S; value: T } | undefined) => T
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
    super(`Cannot read resource value while in error state${detail}`, { cause });
    this.name = 'ResourceErrorState';
  }
}

export function resource<T, R>(options: ResourceLoaderWithParams<T, R>): ResourceRef<T>;
export function resource<T>(options: ResourceLoaderWithoutParams<T>): ResourceRef<T>;
export function resource<T, R>(options: ResourceStreamWithParams<T, R>): ResourceRef<T>;
export function resource<T>(options: ResourceStreamWithoutParams<T>): ResourceRef<T>;
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
    const streamSource = signal<Signal<ResourceStreamItem<T> | undefined> | undefined>(undefined);

    // Effect 1: call stream when params/reload change, store the returned signal
    const streamRef = effect((cleanupFn) => {
      reloadTrigger();

      const controller = new AbortController();
      cleanupFn(() => controller.abort());
      // STACK[STACK.length - 1].addSource(onCleanup);

      const params = hasParams
        ? (options as ResourceLoaderWithParams<T, R> | ResourceStreamWithParams<T, R>).params()
        : undefined;

      status.set('loading');
      error.set(undefined);

      const streamFn = (options as ResourceStreamWithParams<T, R> | ResourceStreamWithoutParams<T>)
        .stream;
      const source = hasParams
        ? (streamFn as ResourceStreamWithParams<T, R>['stream'])({
            params: params,
            abortSignal: controller.signal,
          })
        : (streamFn as ResourceStreamWithoutParams<T>['stream'])({
            abortSignal: controller.signal,
          });

      streamSource.set(source);
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
        reloadTrigger.update((n) => n + 1);
      },
      destroy: (): void => {
        streamRef.destroy();
        resultRef.destroy();
      },
    };
  }

  const ref = effect((onCleanup) => {
    reloadTrigger();

    const params = hasParams
      ? (options as ResourceLoaderWithParams<T, R> | ResourceStreamWithParams<T, R>).params()
      : undefined;

    status.set('loading');
    error.set(undefined);

    const controller = new AbortController();
    onCleanup(() => controller.abort());

    const loaderParams = hasParams
      ? { params: params, abortSignal: controller.signal }
      : { abortSignal: controller.signal };

    (options.loader as ResourceLoaderWithParams<T, R>['loader'])(loaderParams).then(
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
  });

  return {
    value,
    status,
    error,
    isLoading,
    set: setValue,
    update: updateValue,
    reload: (): void => {
      reloadTrigger.update((n) => n + 1);
    },
    destroy: () => ref.destroy(),
  };
}
