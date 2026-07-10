import { WritableSignal } from '../signal';
import { ConsumerProps } from 'react';

/**
 * Tuple type representing React state: [value, setValue].
 *
 * Convenient alias for the tuple returned by useState hook.
 *
 * @template S - The state value type
 *
 * @example
 * ```tsx
 * const [count, setCount]: ReactState<number> = useState(0);
 * ```
 */
export type ReactState<S> = [S, React.Dispatch<React.SetStateAction<S>>];

//
//
//

/**
 * Base interface for a context provider.
 *
 * Defines the minimal contract for any context provider used in registries or services.
 * Sub interfaces like BaseContext and ContextService extend this.
 *
 * @template T - The type of props passed to the Provider component (defaults to unknown)
 */
export interface ProvideContext<T = unknown> {
  /**
   * Unique identifier for this provider.
   * Used in error messages and registry management (like Angular's injection token name).
   */
  name: string;
  /**
   * React functional component that provides the context to its children.
   * Wrap your component tree with this provider to make the context available.
   */
  Provider: React.FC<React.PropsWithChildren<T>>;
}

//
//
//

/**
 * Context created by createBaseContext — wraps React state in a context.
 *
 * Provides hooks and components for state access and rendering.
 *
 * @template T - The type of state managed by this context
 */
export interface BaseContext<T> extends ProvideContext<{ value?: T }> {
  /**
   * Hook to access the context state and setState function.
   * Must be called inside a component under the Provider.
   *
   * @throws Error if called outside the Provider
   * @returns Tuple [state, setState]
   */
  useContext: {
    (): ReactState<T>;
    (options: { optional: true }): ReactState<T> | undefined;
    (options?: { optional?: false }): ReactState<T>;
  };

  /**
   * React component that renders the context value.
   * Optionally accepts a selector function to extract/transform the value.
   *
   * @param props - Configuration options
   * @param props.select - Optional selector function to transform the state before rendering
   * @returns Rendered state value
   */
  Consumer: React.FC<ConsumerProps<T>>;
}

//
//
//

/**
 * Context created by createBaseContextSignal — wraps writable signals in a context.
 *
 * Provides hooks and components for signal access and rendering.
 *
 * @template T - The type of value managed by this context signal
 */
export interface BaseContextSignal<T> extends ProvideContext<{ value?: T }> {
  /**
   * Hook to access the writable context signal.
   * Must be called inside a component under the Provider.
   *
   * @throws Error if called outside the Provider
   * @returns Writable signal for reading and updating the context value
   */
  useContext: {
    (): WritableSignal<T>;
    (options: { optional: true }): WritableSignal<T> | undefined;
    (options?: { optional?: false }): WritableSignal<T>;
  };

  /**
   * React component that renders the context signal value.
   * Optionally accepts a selector function to extract/transform the value.
   *
   * @param props - Configuration options
   * @param props.select - Optional selector function to transform the value before rendering
   * @returns Rendered context value
   */
  Consumer: React.FC<ConsumerProps<T>>;
}

//
//
//

/**
 * Service created by createContextService — a context-backed injectable service.
 *
 * Similar to Angular's @Injectable services but powered by React context and custom hooks.
 *
 * @template T - The service interface type
 */
export interface ContextService<T> extends ProvideContext {
  /**
   * Inject/use the service. Must be called inside a component under the Provider.
   *
   * Overloaded method signatures:
   * - use(): T - Returns the service (throws if called outside Provider)
   * - use({ optional: true }): T | undefined - Returns service or undefined if outside Provider
   * - use({ optional?: false }): T - Same as use() (explicit non-optional)
   *
   * @param options - Options for the injection
   * @param options.optional - If true, returns undefined instead of throwing when outside Provider
   * @returns The service instance, or undefined if optional and outside Provider
   * @throws Error if not optional and called outside Provider
   */
  useContext: {
    (): T;
    (options: { optional: true }): T | undefined;
    (options?: { optional?: false }): T;
  };
}
