/**
 * Returns true when running in a browser-like runtime.
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}