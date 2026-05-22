/**
 * Shared type definitions for ui-inspect packages
 */

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
