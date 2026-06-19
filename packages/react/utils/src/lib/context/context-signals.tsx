import { useSignalState, type WritableSignal } from '../signals';
import React, { ConsumerProps } from 'react';
import { BaseContextSignal } from './types';

export function createBaseContextSignal<T>(
  name: string,
  options: { factory: () => T },
): BaseContextSignal<T> {
  const Context = React.createContext<WritableSignal<T>>(
    undefined as unknown as WritableSignal<T>,
  );

  function Provider({
    children,
    value,
  }: React.PropsWithChildren<{ value?: T }>) {
    const state = useSignalState(value ?? options.factory());

    React.useEffect(() => {
      if (value !== undefined && !Object.is(state(), value)) {
        state.set(value);
      }
    }, [value, state]);

    const contextValue = React.useMemo(() => {
      return Object.assign(() => state(), {
        set: state.set,
        update: state.update,
        asReadOnly: state.asReadOnly,
      }) satisfies WritableSignal<T>;
    }, [state()]);

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
  }

  function useContext(): WritableSignal<T>;
  function useContext(options: {
    optional: true;
  }): WritableSignal<T> | undefined;
  function useContext(options?: { optional?: false }): WritableSignal<T>;
  function useContext(options?: {
    optional?: boolean;
  }): WritableSignal<T> | undefined {
    const context = React.useContext(Context);

    if (context === undefined) {
      if (options?.optional) return undefined;
      throw new Error(`useContext must be used within a ${name} Provider`);
    }

    return context;
  }

  function Consumer({ children }: ConsumerProps<T>) {
    return <Context.Consumer>{(ctx) => children(ctx())}</Context.Consumer>;
  }

  return {
    useContext,
    Provider,
    Consumer,
    name,
  };
}
