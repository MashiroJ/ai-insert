/**
 * Framework adapter factory
 *
 * Detects the available framework and returns the appropriate adapter.
 */
import type { AdapterDetectionResult, AdapterFactoryOptions, FrameworkAdapter } from './interfaces.js';
/**
 * Detect the best adapter for the current page
 */
export declare function detectAdapter(options?: AdapterFactoryOptions): AdapterDetectionResult;
/**
 * Get the best adapter for the current page
 */
export declare function getAdapter(options?: AdapterFactoryOptions): FrameworkAdapter | null;
/**
 * Create an adapter with the given options
 */
export declare function createAdapter(options?: AdapterFactoryOptions): FrameworkAdapter | null;
/**
 * Get all available adapters
 */
export declare function getAvailableAdapters(customAdapters?: FrameworkAdapter[]): FrameworkAdapter[];
/**
 * Get adapter by name
 */
export declare function getAdapterByName(name: string, customAdapters?: FrameworkAdapter[]): FrameworkAdapter | null;
//# sourceMappingURL=factory.d.ts.map