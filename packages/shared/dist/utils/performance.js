/**
 * Performance measurement utilities
 */
const marks = new Map();
/**
 * Start a performance measurement
 */
export function startMark(name, metadata) {
    marks.set(name, {
        name,
        startTime: performance.now(),
        metadata,
    });
}
/**
 * End a performance measurement and return the duration
 */
export function endMark(name) {
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
export function getMark(name) {
    return marks.get(name);
}
/**
 * Clear a performance mark
 */
export function clearMark(name) {
    marks.delete(name);
}
/**
 * Clear all performance marks
 */
export function clearAllMarks() {
    marks.clear();
}
/**
 * Get all performance marks
 */
export function getAllMarks() {
    return Array.from(marks.values());
}
/**
 * Measure async function execution time
 */
export async function measureAsync(name, fn) {
    startMark(name);
    try {
        const result = await fn();
        const duration = endMark(name) || 0;
        return { result, duration };
    }
    finally {
        clearMark(name);
    }
}
/**
 * Measure synchronous function execution time
 */
export function measure(name, fn) {
    startMark(name);
    try {
        const result = fn();
        const duration = endMark(name) || 0;
        return { result, duration };
    }
    finally {
        clearMark(name);
    }
}
/**
 * Create a debounced function that delays invoking func until after wait milliseconds
 */
export function debounce(func, wait, options = {}) {
    let timeoutId;
    let maxTimeoutId;
    let lastCallTime = 0;
    let lastArgs;
    let lastThis;
    let result;
    const { leading = false, trailing = true, maxWait } = options;
    function invokeFunc() {
        const args = lastArgs;
        const thisArg = lastThis;
        lastArgs = [];
        lastThis = undefined;
        timeoutId = undefined;
        maxTimeoutId = undefined;
        result = func.apply(thisArg, args);
        return result;
    }
    function startTimer(pendingFunc, waitMs) {
        return setTimeout(pendingFunc, waitMs);
    }
    function shouldInvoke(time) {
        const timeSinceLastCall = time - lastCallTime;
        return (!timeoutId && // No existing timer
            (timeSinceLastCall >= wait || timeSinceLastCall <= 0) // Enough time passed
        );
    }
    function trailingEdge(time) {
        timeoutId = undefined;
        if (trailing && lastArgs) {
            return invokeFunc();
        }
        lastArgs = [];
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
        lastArgs = [];
        lastThis = undefined;
        return result;
    }
    function debounced(...args) {
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
            }
            else {
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
export function throttle(func, wait, options = {}) {
    return debounce(func, wait, { ...options, maxWait: wait });
}
//# sourceMappingURL=performance.js.map