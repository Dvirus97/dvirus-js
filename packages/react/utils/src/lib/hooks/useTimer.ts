import React, { useEffect } from 'react';

/**
 * Function-like timer accessor returned by useTimer.
 *
 * Call the function to get the latest timer count,
 * or call `clear` to stop future ticks.
 */
export interface TimerGetter {
  /**
   * Returns the latest timer value.
   */
  (): number;

  /**
   * Stops the active timer and prevents future ticks.
   */
  clear: () => void;
}

/**
 * Configuration options for useTimer.
 */
export interface UseTimerOptions {
  /**
   * Function to be called at each interval.
   */
  fn?: (ctx: { value: number }) => void;
  /**
   * Interval in milliseconds. If not provided or non-positive, the timer will not start.
   * @default 1000
   */
  interval?: number;

  /**
   * Optional function to reset the timer count. It receives the current count and can return a new count to reset to.
   * @param value - The current count value of the timer.
   * @returns A new count value to reset to, or `undefined`/`null` to continue incrementing.
   */
  resetTo?: (value: number) => number | undefined | null;

  /**
   * If true, the timer will only tick once and then stop.
   * The count will not reset or increment after the first tick.
   * - setTimeout Behavior
   * @default false
   */
  tickOnce?: boolean;
}

/**
 * React hook that runs a timer and exposes its latest value through a stable getter.
 *
 * The value starts at `0` and increments on each tick unless `resetTo` returns a value.
 * Uses drift-aware scheduling based on `performance.now()` to keep ticks aligned over time.
 *
 * @param options - Timer configuration.
 * @returns A callable getter for the latest timer value, with a `clear()` method to stop the timer.
 */
export function useTimer(options: UseTimerOptions): TimerGetter {
  const { fn, interval = 1000, tickOnce = false, resetTo } = options;

  const [, setCount] = React.useState(0);
  const countRef = React.useRef(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const callbackRef = React.useRef(fn);
  const clearRef = React.useRef<() => void>(() => 0);
  const [wrapper] = React.useState(() => {
    let value = 0;

    const getter = (() => value) as TimerGetter;
    getter.clear = () => clearRef.current();

    return {
      getter,
      setValue(next: number) {
        value = next;
      },
    };
  });

  useEffect(() => {
    callbackRef.current = fn;
  }, [fn]);

  const clear = React.useCallback(() => {
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    clearRef.current = clear;
  }, [clear]);

  useEffect(() => {
    clear();

    if (!Number.isFinite(interval) || interval <= 0) {
      return clear;
    }

    const startAt = performance.now();
    let tick = 0;

    const scheduleNext = () => {
      tick += 1;
      const targetTime = startAt + tick * interval;
      const delay = Math.max(0, targetTime - performance.now());

      timerRef.current = setTimeout(() => {
        const currentValue = countRef.current;
        const resetValue = resetTo ? resetTo(currentValue) : undefined;
        const nextValue = resetValue ?? currentValue + 1;

        countRef.current = nextValue;
        wrapper.setValue(nextValue);
        setCount(nextValue);
        callbackRef.current?.({ value: nextValue });

        if (!tickOnce) {
          scheduleNext();
        }
      }, delay);
    };

    scheduleNext();
    return clear;
  }, [clear, interval, tickOnce, resetTo]);

  return wrapper.getter;
}
