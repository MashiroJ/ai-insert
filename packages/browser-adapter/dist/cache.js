/**
 * Integration of cache utilities into browser-adapter
 *
 * Adds caching layer to framework adapters for better performance.
 */
/**
 * Cached wrapper for framework adapters
 */
export class CachedFrameworkAdapter {
    constructor(baseAdapter) {
        this.baseAdapter = baseAdapter;
        this.componentInfoCache = new WeakMap();
        this.componentChainCache = new WeakMap();
        this.componentTreeCache = new WeakMap();
        this.sourceLocationCache = new WeakMap();
        this.sourceHintsCache = new WeakMap();
        this.name = baseAdapter.name;
        this.version = baseAdapter.version;
    }
    getComponentInfo(element) {
        return this.getCached(this.componentInfoCache, element, () => this.baseAdapter.getComponentInfo(element));
    }
    getComponentChain(element) {
        return this.getCached(this.componentChainCache, element, () => this.baseAdapter.getComponentChain(element));
    }
    getComponentTree(element) {
        return this.getCached(this.componentTreeCache, element, () => this.baseAdapter.getComponentTree(element));
    }
    getSourceLocation(element) {
        return this.getCached(this.sourceLocationCache, element, () => this.baseAdapter.getSourceLocation(element));
    }
    getSourceHints(element) {
        return this.getCached(this.sourceHintsCache, element, () => this.baseAdapter.getSourceHints(element));
    }
    getComponentProps(element) {
        return this.baseAdapter.getComponentProps(element);
    }
    getComponentState(element) {
        return this.baseAdapter.getComponentState(element);
    }
    isAvailable() {
        return this.baseAdapter.isAvailable();
    }
    installDevToolsHook(callback) {
        const cleanup = this.baseAdapter.installDevToolsHook?.(callback);
        return cleanup || (() => { });
    }
    /**
     * Clear any cached data
     */
    clearCache() {
        this.componentInfoCache = new WeakMap();
        this.componentChainCache = new WeakMap();
        this.componentTreeCache = new WeakMap();
        this.sourceLocationCache = new WeakMap();
        this.sourceHintsCache = new WeakMap();
    }
    getCached(cache, element, compute) {
        if (cache.has(element)) {
            return cache.get(element);
        }
        const value = compute();
        cache.set(element, value);
        return value;
    }
}
/**
 * Wrap an adapter with caching layer
 */
export function withCaching(adapter) {
    return new CachedFrameworkAdapter(adapter);
}
//# sourceMappingURL=cache.js.map