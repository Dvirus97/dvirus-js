/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Delay for a given time
 * @param ms - Time in milliseconds
 * @returns Promise
 */
export async function delay(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clamp a value between a minimum and maximum value
 * @param min - Minimum value
 * @param value - Value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(min: number, value: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export interface Debounce<TFn extends (...args: any[]) => void> {
  (...args: Parameters<TFn>): void;
  cancel: () => void;
}

/**
 * Debounce a function
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<
  TFn extends (...args: any[]) => void = (...args: any[]) => void,
>(
  func: TFn,
  delay: number,
  config?: {
    isLoadingFn?: (isLoading: boolean) => void;
  },
): Debounce<TFn> {
  let timer: ReturnType<typeof setTimeout>;
  config?.isLoadingFn?.(false);

  const f = (...args: Parameters<TFn>) => {
    clearTimeout(timer);
    config?.isLoadingFn?.(true);
    timer = setTimeout(() => {
      config?.isLoadingFn?.(false);
      func(...args);
    }, delay);
  };

  return Object.assign(f, {
    cancel() {
      clearTimeout(timer);
      config?.isLoadingFn?.(false);
    },
  });
}

// const debouncedFunc = debounce(() => console.log('Debounced!'), 1000);
// debouncedFunc();
// debouncedFunc();
// // "Debounced!" will be logged only once, 1 second after the last call to debouncedFunc
// setTimeout(() => debouncedFunc.cancel(), 500); // Cancel the debounced function before it executes
