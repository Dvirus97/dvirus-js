import { isBrowser } from './is-browser';

/**
 * Runs the callback once the DOM is ready.
 */
export function whenDomReady(callback: () => void): void {
  if (!isBrowser()) {
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
    return;
  }

  callback();
}
