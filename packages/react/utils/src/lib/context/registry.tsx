import React from 'react';
import { ProvideContext } from './types';

/**
 * Registry type for composed context providers.
 *
 * Manages multiple providers composed in a single component, handling access ordering.
 */
export interface ContextRegistryType {
  /**
   * Provider component that wraps all registered context providers in order.
   *
   * Providers are rendered from innermost (last in array) to outermost (first in array),
   * creating a nested hierarchy where earlier providers wrap later ones.
   */
  Provider: React.FC<React.PropsWithChildren>;
  /**
   * Returns the list of provider names in registration order.
   *
   * @returns Array of provider names (same order as provided to createContextRegistry)
   */
  getProviders: () => string[];
}

/**
 * Factory function to create a context registry from an array of providers.
 *
 * **Generic Context Registry Factory** — Centralized provider management.
 * Create a registry with any providers and compose them into a single component.
 * Works like Angular module providers.
 *
 * **Provider order matters:**
 * - First provider in the array = outermost wrapper
 * - Each provider can access contexts from providers before it
 * - Later providers cannot access contexts from providers after them
 *
 * Providers are composed in order: the first provider in the array is outermost
 * and accessible to all subsequent providers. Each provider can access the context
 * of earlier providers.
 *
 * @param providers - Array of provider objects in the order they should be composed
 *                    (first item = outermost, last item = innermost)
 * @returns ContextRegistryType with Provider component and getProviders() method
 *
 * @example
 * ```tsx
 * // Define some services
 * const AuthService = createContextService('AuthService', useAuthLogic);
 * const ThemeService = createContextService('ThemeService', useThemeLogic);
 *
 * // Create a registry in desired nesting order
 * const AppRegistry = createContextRegistry([
 *   AuthService,    // Outermost - accessible to all
 *   ThemeService,   // Inner - can access AuthService
 * ]);
 *
 * // Use in your app
 * function App() {
 *   return (
 *     <AppRegistry.Provider>
 *       <MainContent />
 *     </AppRegistry.Provider>
 *   );
 * }
 *
 * // Access services inside components
 * function MainContent() {
 *   const auth = AuthService.use();
 *   const theme = ThemeService.use();
 *   return <div className={theme.className}>{auth.user?.name}</div>;
 * }
 * ```
 */
export function createContextRegistry(
  providers: ProvideContext[],
): ContextRegistryType {
  return {
    Provider: ({ children }) =>
      providers.reduceRight(
        (acc, { Provider }) => <Provider>{acc}</Provider>,
        children,
      ),
    getProviders: () => providers.map((p) => p.name),
  };
}
