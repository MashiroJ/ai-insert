/**
 * Performance measurement utilities
 */
export interface PerformanceMark {
    name: string;
    startTime: number;
    duration?: number;
    metadata?: Record<string, unknown>;
}
/**
 * Start a performance measurement
 */
export declare function startMark(name: string, metadata?: Record<string, unknown>): void;
/**
 * End a performance measurement and return the duration
 */
export declare function endMark(name: string): number | undefined;
/**
 * Get a performance mark by name
 */
export declare function getMark(name: string): PerformanceMark | undefined;
/**
 * Clear a performance mark
 */
export declare function clearMark(name: string): void;
/**
 * Clear all performance marks
 */
export declare function clearAllMarks(): void;
/**
 * Get all performance marks
 */
export declare function getAllMarks(): PerformanceMark[];
/**
 * Measure async function execution time
 */
export declare function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<{
    result: T;
    duration: number;
}>;
/**
 * Measure synchronous function execution time
 */
export declare function measure<T>(name: string, fn: () => T): {
    result: T;
    duration: number;
};
/**
 * Create a debounced function that delays invoking func until after wait milliseconds
 */
export declare function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number, options?: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
}): (...args: Parameters<T>) => void;
/**
 * Create a throttled function that only invokes func at most once per every wait milliseconds
 */
export declare function throttle<T extends (...args: unknown[]) => unknown>(func: T, wait: number, options?: {
    leading?: boolean;
    trailing?: boolean;
}): (...args: Parameters<T>) => void;
//# sourceMappingURL=performance.d.ts.map