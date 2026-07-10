import React, { createContext, useContext, useMemo } from 'react';
import { JSX } from 'react/jsx-runtime';

/**
 * Configuration options for signals integration with React.
 *
 * watchSignalChange controls the default behavior of signal-backed hooks
 * within React components. When true, hooks that return signals will also
 * subscribe and cause component re-renders on signal updates. When false,
 * hooks remain silent and components will not re-render automatically.
 */
export interface SignalsConfigOptions {
  /**
   * Default behavior for whether signal hook changes should trigger React re-renders.
   * - true  -> signal hooks will subscribe and reRender the component
   * - false -> signal hooks will be silent (use dedicated S component for updates)
   */
  watchSignalChange?: boolean;
}

/**
 * Global default configuration object for signals integration.
 * Use setSignalsConfig or SignalConfigProvider to change these values.
 */
export const signalConfig = {
  watchSignalChange: true,
};

/**
 * Set global signals configuration at runtime. This mutates the shared
 * configuration object used by signal hooks. Intended to be called during
 * application setup (e.g. before the app renders) or from a provider.
 *
 * @param {SignalsConfigOptions} config - partial configuration to merge
 */
export function setSignalsConfig(config: SignalsConfigOptions) {
  Object.assign(signalConfig, config);
}

/**
 * Read the current global configuration for signals.
 *
 * @returns {SignalsConfigOptions} the active signals configuration object
 */
export function getSignalsConfig(): SignalsConfigOptions {
  return signalConfig;
}

const SignalConfigContext = createContext<SignalsConfigOptions>(signalConfig);

/**
 * React context provider to set signals configuration for a subtree. The
 * provider will merge the provided options into the global configuration and
 * expose the same options value through React context.
 *
 * @param {{options: SignalsConfigOptions, children: React.ReactNode}} props - provider props
 * @returns {JSX.Element} the provider element wrapping children
 */
export function SignalConfigProvider({
  options,
  children,
}: {
  options: SignalsConfigOptions;
  children: React.ReactNode;
}): JSX.Element {
  // Memoize the settings object to ensure it stays stable across renders
  const value = useMemo(() => {
    setSignalsConfig(options);
    return options;
  }, [options]);

  return (
    <SignalConfigContext.Provider value={value}>
      {children}
    </SignalConfigContext.Provider>
  );
}

/**
 * hook for reading the signals configuration from React context.
 * Falls back to the default context value when no provider is present.
 *
 * @returns {SignalsConfigOptions} the context configuration value
 */
export function useSignalConfig(): SignalsConfigOptions {
  return useContext(SignalConfigContext);
}
