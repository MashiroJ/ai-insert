/**
 * Performance measurement utilities
 */

export interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

const marks = new Map<string, PerformanceMark>();

/**
 * Start a performance measurement
 */
export function startMark(name: string, metadata?: Record<string, unknown>): void {
  marks.set(name, {
    name,
    startTime: performance.now(),
    metadata,
  });
}

/**
 * End a performance measurement and return the duration
 */
export function endMark(name: string): number | undefined {
  const mark = marks.get(name);
  if (!mark) {
    return undefined;
  }

  const duration = performance.now() - mark.startTime;
  mark.duration = duration;
  marks.set(name, mark);

  return duration;
}

/**
 * Get a performance mark by name
 */
export function getMark(name: string): PerformanceMark | undefined {
  return marks.get(name);
}

/**
 * Clear a performance mark
 */
export function clearMark(name: string): void {
  marks.delete(name);
}

/**
 * Clear all performance marks
 */
export function clearAllMarks(): void {
  marks.clear();
}

/**
 * Get all performance marks
 */
export function getAllMarks(): PerformanceMark[] {
  return Array.from(marks.values());
}

/**
 * Measure async function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  startMark(name);
  try {
    const result = await fn();
    const duration = endMark(name) || 0;
    return { result, duration };
  } finally {
    clearMark(name);
  }
}

/**
 * Measure synchronous function execution time
 */
export function measure<T>(
  name: string,
  fn: () => T
): { result: T; duration: number } {
  startMark(name);
  try {
    const result = fn();
    const duration = endMark(name) || 0;
    return { result, duration };
  } finally {
    clearMark(name);
  }
}

/**
 * Create a debounced function that delays invoking func until after wait milliseconds
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {}
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let maxTimeoutId: ReturnType<typeof setTimeout> | undefined;
  let lastCallTime = 0;
  let lastArgs: Parameters<T>;
  let lastThis: unknown;
  let result: unknown;

  const { leading = false, trailing = true, maxWait } = options;

  function invokeFunc() {
    const args = lastArgs;
    const thisArg = lastThis;

    lastArgs = [] as unknown as Parameters<T>;
    lastThis = undefined;
    timeoutId = undefined;
    maxTimeoutId = undefined;

    result = func.apply(thisArg, args);
    return result;
  }

  function startTimer(pendingFunc: () => void, waitMs: number) {
    return setTimeout(pendingFunc, waitMs);
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - lastCallTime;
    return (
      !timeoutId && // No existing timer
      (timeSinceLastCall >= wait || timeSinceLastCall <= 0) // Enough time passed
    );
  }

  function trailingEdge(time: number) {
    timeoutId = undefined;

    if (trailing && lastArgs) {
      return invokeFunc();
    }

    lastArgs = [] as unknown as Parameters<T>;
    lastThis = undefined;
    return result;
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }

    const remaining = wait - (time - lastCallTime);
    timeoutId = startTimer(timerExpired, remaining);
  }

  function maxExpired() {
    if (lastArgs) {
      return invokeFunc();
    }
    lastArgs = [] as unknown as Parameters<T>;
    lastThis = undefined;
    return result;
  }

  function debounced(this: unknown, ...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === undefined) {
        if (leading) {
          result = invokeFunc();
        }
      } else {
        clearTimeout(timeoutId);
      }

      if (maxWait !== undefined) {
        maxTimeoutId = startTimer(maxExpired, maxWait);
      }

      timeoutId = startTimer(timerExpired, wait);
    }

    return result;
  }

  return debounced;
}

/**
 * Create a throttled function that only invokes func at most once per every wait milliseconds
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): (...args: Parameters<T>) => void {
  return debounce(func, wait, { ...options, maxWait: wait });
}
