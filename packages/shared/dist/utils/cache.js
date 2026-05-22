/**
 * Performance optimization utilities
 *
 * Caching and performance helpers for ui-inspect browser client
 */
/**
 * Simple LRU cache with TTL
 */
export class TLCache {
    cache = new Map();
    maxSize;
    defaultTTL;
    constructor(options = {}) {
        this.maxSize = options.maxSize ?? 100;
        this.defaultTTL = options.ttl ?? 5000; // 5 seconds default
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        // Update hits and move to end (LRU)
        entry.hits++;
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }
    set(key, value, ttl) {
        // Enforce max size
        if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
            // Delete oldest entry (first in Map)
            const first = this.cache.keys().next();
            if (!first.done) {
                this.cache.delete(first.value);
            }
        }
        const entry = {
            value,
            expiresAt: Date.now() + (ttl ?? this.defaultTTL),
            createdAt: Date.now(),
            hits: 0,
        };
        this.cache.set(key, entry);
    }
    has(key) {
        const entry = this.cache.get(key);
        return entry !== undefined && Date.now() <= entry.expiresAt;
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    get size() {
        return this.cache.size;
    }
    get stats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
                key: String(key),
                hits: entry.hits,
                age: Date.now() - entry.createdAt,
                ttl: entry.expiresAt - Date.now(),
            })),
        };
    }
}
/**
 * Selector cache for CSS selector computation
 */
export class SelectorCache extends TLCache {
    constructor() {
        super({
            maxSize: 200,
            ttl: 10000, // 10 seconds
        });
    }
    /**
     * Generate cache key from element
     */
    static keyFrom(element) {
        return `${element.tagName}:${element.id}:${element.className}:${element.getAttribute('key') || ''}`;
    }
    /**
     * Get selector for element with caching
     */
    getSelector(element, computeFn) {
        const key = SelectorCache.keyFrom(element);
        let selector = this.get(key);
        if (!selector) {
            selector = computeFn();
            this.set(key, selector);
        }
        return selector;
    }
}
/**
 * Component info cache for framework adapter results
 */
export class ComponentCache extends TLCache {
    constructor() {
        super({
            maxSize: 100,
            ttl: 5000, // 5 seconds
        });
    }
    /**
     * Get component info with caching
     */
    getComponentInfo(element, computeFn) {
        const info = this.get(element);
        if (!info) {
            const result = computeFn();
            if (result) {
                this.set(element, result, 2000); // Component info changes less frequently
            }
            return result;
        }
        return info;
    }
}
/**
 * Debounce function with leading edge
 */
export function debounceAdvanced(func, wait, options = {}) {
    let timeoutId;
    let lastArgs;
    let lastThis;
    let result;
    const { leading = false, trailing = true } = options;
    function invokeFunc() {
        const args = lastArgs;
        const thisArg = lastThis;
        lastArgs = [];
        lastThis = undefined;
        timeoutId = undefined;
        result = func.apply(thisArg, args);
        return result;
    }
    function shouldInvoke(time) {
        const timeSinceLastCall = time - (lastArgs ? 0 : time);
        return !timeoutId && timeSinceLastCall >= wait;
    }
    function timerExpired() {
        const now = Date.now();
        if (shouldInvoke(now)) {
            return trailingEdge();
        }
        timeoutId = undefined;
    }
    function trailingEdge() {
        timeoutId = undefined;
        if (trailing && lastArgs) {
            return invokeFunc();
        }
        lastArgs = [];
        lastThis = undefined;
        return result;
    }
    return function (...args) {
        const now = Date.now();
        lastArgs = args;
        lastThis = this;
        if (!timeoutId && leading && shouldInvoke(now)) {
            return invokeFunc();
        }
        if (!timeoutId) {
            timeoutId = setTimeout(timerExpired, wait);
        }
        return result;
    };
}
/**
 * Throttle function
 */
export function throttleAdvanced(func, wait) {
    return debounceAdvanced(func, wait, { leading: true, trailing: false });
}
/**
 * Request animation frame throttle
 */
export function rafThrottleAdvanced(func) {
    let rafId = null;
    let lastArgs = null;
    return function (...args) {
        lastArgs = args;
        if (rafId === null) {
            rafId = requestAnimationFrame(() => {
                rafId = null;
                if (lastArgs) {
                    func.apply(this, lastArgs);
                    lastArgs = null;
                }
            });
        }
    };
}
/**
 * Measure execution time
 */
export async function measurePerformance(name, fn) {
    const start = performance.now();
    try {
        const result = await fn();
        const duration = performance.now() - start;
        // Only log if duration > 16ms (one frame)
        if (duration > 16) {
            console.warn(`[ui-inspect] ${name} took ${duration.toFixed(2)}ms`);
        }
        return { result, duration };
    }
    catch (error) {
        const duration = performance.now() - start;
        console.error(`[ui-inspect] ${name} failed after ${duration.toFixed(2)}ms`, error);
        throw error;
    }
}
/**
 * Create a memoized version of a function
 */
export function memoizeAdvanced(fn, keyFn) {
    const cache = new Map();
    return ((...args) => {
        const key = keyFn ? keyFn(...args) : JSON.stringify(args);
        if (!cache.has(key)) {
            cache.set(key, fn(...args));
        }
        return cache.get(key);
    });
}
/**
 * Create a lazy value that computes only once
 */
export function lazyValue(fn) {
    let computed = false;
    let value;
    return () => {
        if (!computed) {
            value = fn();
            computed = true;
        }
        return value;
    };
}
/**
 * Create a lazy async value that loads only once
 * Useful for dynamic imports and lazy-loaded modules
 */
export function lazyAsync(fn) {
    let loading = null;
    let value = null;
    return () => {
        if (value !== null) {
            return Promise.resolve(value);
        }
        if (!loading) {
            loading = fn().then((result) => {
                value = result;
                return result;
            });
        }
        return loading;
    };
}
/**
 * Lazy module loader with caching and error handling
 */
export class LazyModuleLoader {
    loadFn;
    cache = null;
    loading = null;
    error = null;
    constructor(loadFn) {
        this.loadFn = loadFn;
    }
    /**
     * Load the module (cached after first load)
     */
    async load() {
        // Return cached value if available
        if (this.cache !== null) {
            return this.cache;
        }
        // Return existing load promise if loading
        if (this.loading !== null) {
            return this.loading;
        }
        // Throw cached error if previous load failed
        if (this.error !== null) {
            throw this.error;
        }
        // Start loading
        this.loading = this.loadFn()
            .then((module) => {
            this.cache = module;
            this.loading = null;
            return module;
        })
            .catch((err) => {
            this.error = err;
            this.loading = null;
            throw err;
        });
        return this.loading;
    }
    /**
     * Check if module is loaded
     */
    isLoaded() {
        return this.cache !== null;
    }
    /**
     * Check if module is currently loading
     */
    isLoading() {
        return this.loading !== null;
    }
    /**
     * Clear cache (force reload on next access)
     */
    reset() {
        this.cache = null;
        this.loading = null;
        this.error = null;
    }
    /**
     * Get cached value without loading (returns null if not loaded)
     */
    getIfLoaded() {
        return this.cache;
    }
}
/**
 * Batch DOM reads/writes using requestIdleCallback or setTimeout
 */
export function batchUpdates(fn) {
    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
        let result;
        requestIdleCallback(() => {
            result = fn();
        });
        return result;
    }
    // Fallback: immediate execution with microtask
    return fn();
}
/**
 * Performance marker for measuring operations
 */
export class PerformanceMarker {
    marks = new Map();
    mark(name) {
        this.marks.set(name, performance.now());
    }
    measure(name, startMark) {
        const end = performance.now();
        const start = startMark !== undefined
            ? this.marks.get(startMark) ?? 0
            : this.marks.get(name) ?? 0;
        const duration = end - start;
        this.marks.delete(name);
        return duration;
    }
    clear() {
        this.marks.clear();
    }
}
//# sourceMappingURL=cache.js.map