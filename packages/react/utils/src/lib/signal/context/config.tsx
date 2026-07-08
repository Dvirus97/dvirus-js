import React, { createContext, useContext, useMemo } from 'react';

export interface SignalsConfigOptions {
  /**
   * set the signal watch options default value.
   * - if `true`, signal hooks will reRender the component.
   * - if `false`, signal hooks will be silent. (need to use `<S/>` S component)
   */
  watchSignalChange?: boolean;
}

export const signalConfig = {
  watchSignalChange: true,
};

/**
 * ### use in Main.tsx or App.tsx before the app render.
 */
export function setSignalsConfig(config: SignalsConfigOptions) {
  Object.assign(signalConfig, config);
}
export function getSignalsConfig(): SignalsConfigOptions {
  return signalConfig;
}

const SignalConfigContext = createContext<SignalsConfigOptions>({
  watchSignalChange: false,
});

export function SignalConfigProvider({
  options,
  children,
}: {
  options: SignalsConfigOptions;
  children: React.ReactNode;
}) {
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

// Internal custom hook to quickly read configuration tokens safely
export function useSignalConfig() {
  return useContext(SignalConfigContext);
}
