import {
  effect,
  untracked,
  useLocalSignal,
  type WritableSignal,
} from '../signal';
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
    const state = useLocalSignal(value ?? options.factory());

    React.useEffect(() => {
      const eRef = effect(() => {
        if (value !== undefined && !Object.is(state(), value)) {
          untracked(() => {
            state.set(value);
          });
        }
      });

      return () => eRef.destroy();
    }, []);

    return <Context.Provider value={state}>{children}</Context.Provider>;
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
