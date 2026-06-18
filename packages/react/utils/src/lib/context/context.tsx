import React, { ConsumerProps } from 'react';
import { BaseContext, ContextService, ReactState } from './types';

/**
 * Creates a React Context with useState-backed state and a value renderer.
 *
 * Useful for simple state sharing via context. The Provider manages state with useState,
 * and consumers access the value via the useContext hook.
 *
 * @template T - The type of state managed by this context
 * @param name - Descriptive name for error messages (displayed when useContext is called outside Provider)
 * @param options - Configuration object containing the state factory function
 * @param options.factory - Function that returns the initial state value
 * @returns BaseContext with Provider, useContext hook, and ValueComponent
 *
 * @example
 * ```tsx
 * const CounterContext = createBaseContext('CounterContext', {
 *   factory: () => 0
 * });
 *
 * function App() {
 *   return (
 *     <CounterContext.Provider value={5}>
 *       <Counter />
 *     </CounterContext.Provider>
 *   );
 * }
 *
 * function Counter() {
 *   const [count, setCount] = CounterContext.useContext();
 *   return <div>{count}</div>;
 * }
 * ```
 */
export function createBaseContext<T>(
  name: string,
  options: { factory: () => T },
): BaseContext<T> {
  const Context = React.createContext<ReactState<T>>(
    undefined as unknown as ReactState<T>,
  );

  function Provider({
    children,
    value,
  }: React.PropsWithChildren<{ value?: T }>) {
    const [state, setState] = React.useState<T>(value ?? options.factory());
    const contextValue = React.useMemo(
      () => [state, setState] as ReactState<T>,
      [state],
    );

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
  }

  function useContext() {
    const context = React.useContext(Context);
    if (context === undefined) {
      throw new Error(`useContext must be used within a ${name} Provider`);
    }
    return context;
  }

  function Consumer({ children }: ConsumerProps<T>) {
    return <Context.Consumer>{(ctx) => children(ctx[0])}</Context.Consumer>;
  }

  return { useContext, Provider, Consumer, name };
}

/**
 * Creates a React-context-backed service from a hook factory.
 *
 * Like an Angular @Injectable service, but powered by React context and custom hooks.
 * The factory function can use any React hooks (useState, useEffect, etc.) and return
 * a service object. Multiple Provider instances will have independent service instances.
 *
 * @template T - The service interface type returned by the factory
 * @param name - Descriptive name for error messages (displayed when use() is called outside Provider)
 * @param factory - A custom hook function that returns the service object.
 *                  Can call any React hooks (useState, useEffect, useCallback, etc.).
 *                  The returned object becomes the service interface.
 * @returns ContextService with Provider component and use() hook for dependency injection
 *
 * @example
 * ```tsx
 * interface CounterService {
 *   count: number;
 *   increment: () => void;
 *   reset: () => void;
 * }
 *
 * const CounterService = createContextService<CounterService>(
 *   "CounterService",
 *   () => {
 *     const [count, setCount] = useState(0);
 *     return {
 *       count,
 *       increment: () => setCount((n) => n + 1),
 *       reset: () => setCount(0),
 *     };
 *   }
 * );
 *
 * // Provide at root or feature level:
 * <CounterService.Provider>
 *   <MyComponent />
 * </CounterService.Provider>
 *
 * // Inject anywhere below:
 * function MyComponent() {
 *   const { count, increment, reset } = CounterService.use();
 *   // const service: T | undefined = service.use({optional: true}) can be used to avoid errors if Provider is missing
 *   return (
 *     <div>
 *       Count: {count}
 *       <button onClick={increment}>+1</button>
 *       <button onClick={reset}>Reset</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function createContextService<T>(
  name: string,
  useFactory: () => T,
): ContextService<T> {
  const Context = React.createContext<T | undefined>(undefined);

  function Provider({ children }: React.PropsWithChildren) {
    // factory is a custom hook — runs on every Provider render,
    // but state references inside are stable (backed by useState).
    const service = useFactory();
    return <Context.Provider value={service}>{children}</Context.Provider>;
  }

  function useContext(): T;
  function useContext(options: { optional: true }): T | undefined;
  function useContext(options?: { optional?: false }): T;
  function useContext(options?: { optional?: boolean }): T | undefined {
    const ctx = React.useContext(Context);
    if (ctx === undefined) {
      if (options?.optional) {
        return undefined;
      }
      throw new Error(`${name}.use() must be called inside <${name}.Provider>`);
    }
    return ctx;
  }

  return { useContext, Provider, name };
}
