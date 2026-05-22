/**
 * Performance optimization utilities
 *
 * Caching and performance helpers for ui-inspect browser client
 */
export interface CacheEntry<T> {
    value: T;
    expiresAt: number;
    createdAt: number;
    hits: number;
}
export interface CacheOptions {
    ttl?: number;
    maxSize?: number;
}
/**
 * Simple LRU cache with TTL
 */
export declare class TLCache<K, V> {
    private cache;
    private maxSize;
    private defaultTTL;
    constructor(options?: CacheOptions);
    get(key: K): V | undefined;
    set(key: K, value: V, ttl?: number): void;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    get size(): number;
    get stats(): {
        size: number;
        maxSize: number;
        entries: {
            key: string;
            hits: number;
            age: number;
            ttl: number;
        }[];
    };
}
/**
 * Selector cache for CSS selector computation
 */
export declare class SelectorCache extends TLCache<string, string> {
    constructor();
    /**
     * Generate cache key from element
     */
    static keyFrom(element: HTMLElement): string;
    /**
     * Get selector for element with caching
     */
    getSelector(element: HTMLElement, computeFn: () => string): string;
}
/**
 * Component info cache for framework adapter results
 */
export declare class ComponentCache extends TLCache<HTMLElement, {
    name: string;
    file?: string;
    instanceId?: string;
}> {
    constructor();
    /**
     * Get component info with caching
     */
    getComponentInfo(element: HTMLElement, computeFn: () => {
        name: string;
        file?: string;
        instanceId?: string;
    } | null): ReturnType<typeof computeFn>;
}
/**
 * Debounce function with leading edge
 */
export declare function debounceAdvanced<T extends (...args: unknown[]) => unknown>(func: T, wait: number, options?: {
    leading?: boolean;
    trailing?: boolean;
}): (...args: Parameters<T>) => void;
/**
 * Throttle function
 */
export declare function throttleAdvanced<T extends (...args: unknown[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * Request animation frame throttle
 */
export declare function rafThrottleAdvanced<T extends (...args: unknown[]) => unknown>(func: T): (...args: Parameters<T>) => void;
/**
 * Measure execution time
 */
export declare function measurePerformance<T>(name: string, fn: () => Promise<T>): Promise<{
    result: T;
    duration: number;
}>;
/**
 * Create a memoized version of a function
 */
export declare function memoizeAdvanced<T extends (...args: unknown[]) => unknown>(fn: T, keyFn?: (...args: Parameters<T>) => string): T;
/**
 * Create a lazy value that computes only once
 */
export declare function lazyValue<T>(fn: () => T): () => T;
/**
 * Create a lazy async value that loads only once
 * Useful for dynamic imports and lazy-loaded modules
 */
export declare function lazyAsync<T>(fn: () => Promise<T>): () => Promise<T>;
/**
 * Lazy module loader with caching and error handling
 */
export declare class LazyModuleLoader<T> {
    private loadFn;
    private cache;
    private loading;
    private error;
    constructor(loadFn: () => Promise<T>);
    /**
     * Load the module (cached after first load)
     */
    load(): Promise<T>;
    /**
     * Check if module is loaded
     */
    isLoaded(): boolean;
    /**
     * Check if module is currently loading
     */
    isLoading(): boolean;
    /**
     * Clear cache (force reload on next access)
     */
    reset(): void;
    /**
     * Get cached value without loading (returns null if not loaded)
     */
    getIfLoaded(): T | null;
}
/**
 * Batch DOM reads/writes using requestIdleCallback or setTimeout
 */
export declare function batchUpdates<T>(fn: () => T): T;
/**
 * Performance marker for measuring operations
 */
export declare class PerformanceMarker {
    private marks;
    mark(name: string): void;
    measure(name: string, startMark?: string): number;
    clear(): void;
}
//# sourceMappingURL=cache.d.ts.map