/**
 * Lazy framework adapter factory
 *
 * Loads framework adapters on-demand to reduce initial bundle size.
 */
import type { AdapterDetectionResult, AdapterFactoryOptions, FrameworkAdapter } from './interfaces.js';
/**
 * Detect the best adapter for the current page (lazy loading)
 *
 * Adapters are loaded on-demand during detection. Once loaded, they are cached.
 */
export declare function detectAdapterLazy(options?: AdapterFactoryOptions): Promise<AdapterDetectionResult>;
/**
 * Get the best adapter for the current page (lazy loading)
 */
export declare function getAdapterLazy(options?: AdapterFactoryOptions): Promise<FrameworkAdapter | null>;
/**
 * Create an adapter with the given options (lazy loading)
 */
export declare function createAdapterLazy(options?: AdapterFactoryOptions): Promise<FrameworkAdapter | null>;
/**
 * Get adapter by name (lazy loading)
 */
export declare function getAdapterByNameLazy(name: string): Promise<FrameworkAdapter | null>;
/**
 * Clear adapter cache (force reload on next access)
 */
export declare function clearAdapterCache(name?: string): void;
/**
 * Get all currently loaded adapters (without loading new ones)
 */
export declare function getLoadedAdapters(): FrameworkAdapter[];
//# sourceMappingURL=lazy-factory.d.ts.map