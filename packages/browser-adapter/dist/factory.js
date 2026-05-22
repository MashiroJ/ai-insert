/**
 * Framework adapter factory
 *
 * Detects the available framework and returns the appropriate adapter.
 */
import { vanillaAdapter } from './vanilla-adapter.js';
import { vue3Adapter } from './vue-adapter.js';
import { reactAdapter } from './react-adapter.js';
/**
 * Default adapter list
 */
const DEFAULT_ADAPTERS = [
    vue3Adapter,
    reactAdapter,
    vanillaAdapter,
];
/**
 * Detect the best adapter for the current page
 */
export function detectAdapter(options = {}) {
    const { preferredAdapter, allowFallback = true, customAdapters = [], } = options;
    const allAdapters = [...customAdapters, ...DEFAULT_ADAPTERS];
    // If preferred adapter is specified and available, use it
    if (preferredAdapter) {
        const preferred = allAdapters.find((a) => a.name === preferredAdapter);
        if (preferred && preferred.isAvailable()) {
            return {
                adapter: preferred,
                confidence: 1,
                reason: `Preferred adapter '${preferredAdapter}' is available`,
            };
        }
    }
    // Detect available adapters
    const available = allAdapters.filter((a) => a.isAvailable());
    if (available.length === 0) {
        if (allowFallback) {
            return {
                adapter: vanillaAdapter,
                confidence: 0.1,
                reason: 'No framework detected, falling back to vanilla adapter',
            };
        }
        return {
            adapter: null,
            confidence: 0,
            reason: 'No framework adapter available',
        };
    }
    // Prioritize non-vanilla adapters
    const frameworkAdapters = available.filter((a) => a.name !== 'vanilla');
    if (frameworkAdapters.length > 0) {
        // Return the first available framework adapter
        const adapter = frameworkAdapters[0];
        return {
            adapter,
            confidence: 0.9,
            reason: `Framework '${adapter.name}' detected`,
        };
    }
    // Only vanilla is available
    return {
        adapter: vanillaAdapter,
        confidence: 0.5,
        reason: 'Using vanilla adapter',
    };
}
/**
 * Get the best adapter for the current page
 */
export function getAdapter(options = {}) {
    const result = detectAdapter(options);
    return result.adapter;
}
/**
 * Create an adapter with the given options
 */
export function createAdapter(options = {}) {
    return getAdapter(options);
}
/**
 * Get all available adapters
 */
export function getAvailableAdapters(customAdapters = []) {
    const allAdapters = [...customAdapters, ...DEFAULT_ADAPTERS];
    return allAdapters.filter((a) => a.isAvailable());
}
/**
 * Get adapter by name
 */
export function getAdapterByName(name, customAdapters = []) {
    const allAdapters = [...customAdapters, ...DEFAULT_ADAPTERS];
    return allAdapters.find((a) => a.name === name) || null;
}
//# sourceMappingURL=factory.js.map