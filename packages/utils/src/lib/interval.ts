/**
 * Schedules repeating drift-aware ticks using performance.now() as the clock,
 * so ticks stay aligned to `interval` over time instead of drifting from
 * cumulative setTimeout overhead.
 *
 * @returns a cleanup function.
 */
export function startDriftAwareInterval(options: {
  interval: number;
  tickOnce?: boolean;
  onTick: (tick: number) => void;
}): () => void {
  const { interval, tickOnce = false, onTick } = options;

  if (!Number.isFinite(interval) || interval <= 0) {
    return () => 0;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let cleared = false;
  const startAt = performance.now();
  let tick = 0;

  const scheduleNext = () => {
    tick += 1;
    const targetTime = startAt + tick * interval;
    const delay = Math.max(0, targetTime - performance.now());

    timeoutId = setTimeout(() => {
      if (cleared) return;
      onTick(tick);
      if (!tickOnce) scheduleNext();
    }, delay);
  };

  scheduleNext();

  return () => {
    cleared = true;
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };
}
