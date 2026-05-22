/**
 * Shared type definitions for ui-inspect packages
 */

/** Cache entry with TTL */
export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

/** Debounce function options */
export interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

/** Throttle function options */
export interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}
